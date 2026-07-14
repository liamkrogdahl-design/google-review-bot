import { NextRequest, NextResponse, after } from "next/server"
import { client } from "@/lib/twilioClient"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { toE164 } from "@/lib/reviewLink"

// Buys a brand new dedicated Twilio number for this business and returns its
// number string, or null if none could be provisioned (e.g. no inventory,
// account restrictions, API error). This ONLY ever creates a new number
// resource — it never lists, reads, or modifies any number that already
// exists on the account, so it cannot touch RingBack's numbers no matter
// what. Real money is spent here (~$1/mo per number) every time this runs.
async function provisionTwilioNumber(businessName: string, ownerPhone: string): Promise<string | null> {
  try {
    // Try to match the owner's own area code for a locally-flavored number first.
    // Wrapped in its own try so a malformed/short phone number just falls through
    // to the generic search below instead of aborting provisioning entirely.
    const areaCodeDigits = ownerPhone.replace(/\D/g, "").slice(-10, -7)
    const areaCode = /^\d{3}$/.test(areaCodeDigits) ? Number(areaCodeDigits) : undefined

    let available: Array<{ phoneNumber: string }> = []
    if (areaCode) {
      try {
        available = await client.availablePhoneNumbers("US").local.list({ areaCode, smsEnabled: true, limit: 1 })
      } catch {
        available = []
      }
    }

    if (available.length === 0) {
      // Fall back to any available US number if none in that area code (or no area code)
      available = await client.availablePhoneNumbers("US").local.list({
        smsEnabled: true,
        limit: 1,
      })
    }

    if (available.length === 0) return null

    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber: available[0].phoneNumber,
      friendlyName: `ReviewPing — ${businessName}`,
    })

    return purchased.phoneNumber
  } catch (e) {
    console.error("TWILIO NUMBER PROVISIONING FAILED", e)
    return null
  }
}

// Signups spend real money automatically (Twilio number purchase), so cap how
// many can come from one IP per hour before we ever touch Supabase or Twilio.
// This is deliberately simple (no external rate-limit service) — a table plus
// a count query is enough to stop runaway bot/abuse spend without adding
// infrastructure. Legitimate users signing up once will never hit this.
const SIGNUP_LIMIT_PER_IP = 3
const SIGNUP_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

export async function POST(req: NextRequest) {
  const { businessName, email, password, ownerPhone } = await req.json()

  if (!businessName || !email || !password || !ownerPhone) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }

  const ip = getClientIp(req)
  const rateLimitDb = getSupabaseAdmin()
  const windowStart = new Date(Date.now() - SIGNUP_LIMIT_WINDOW_MS).toISOString()

  const { count } = await rateLimitDb
    .from("signup_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", windowStart)

  if ((count ?? 0) >= SIGNUP_LIMIT_PER_IP) {
    return NextResponse.json(
      { error: "Too many signup attempts from this connection. Please try again in an hour." },
      { status: 429 }
    )
  }

  // Record this attempt before doing anything else, so concurrent/rapid
  // requests from the same IP are still counted correctly.
  await rateLimitDb.from("signup_attempts").insert({ ip })

  const supabase = await createSupabaseServerClient()
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    // Pin the confirmation email's redirect explicitly rather than relying on
    // whatever "Site URL" happens to be configured in the Supabase dashboard
    // (which often still defaults to localhost on a fresh project).
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login` },
  })

  if (signUpError || !signUpData.user) {
    return NextResponse.json({ error: signUpError?.message || "Signup failed" }, { status: 400 })
  }

  const userId = signUpData.user.id
  const normalizedOwnerPhone = toE164(ownerPhone)
  const db = getSupabaseAdmin()

  const { error: insertErr } = await db.from("businesses").insert({
    auth_user_id: userId,
    business_name: businessName,
    owner_phone: normalizedOwnerPhone,
  })

  if (insertErr) {
    // Roll back the auth user so this email/phone isn't stuck unusable
    // (e.g. owner_phone unique constraint hit because they already signed up).
    await db.auth.admin.deleteUser(userId)
    const message = insertErr.message.includes("owner_phone")
      ? "An account already exists for that phone number."
      : insertErr.message
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Respond right away instead of making the customer wait on Twilio — number
  // search + purchase is two sequential external API calls, which on a slow
  // network could push past Vercel's serverless function time limit (10s on
  // the Hobby plan) and fail the whole signup even though the account itself
  // was already created successfully. `after()` runs this once the response
  // has been sent, so a slow or flaky Twilio call can never break signup.
  // The dashboard already shows a "still being set up" banner until this
  // finishes, so this is always safe to defer.
  after(async () => {
    const twilioNumber = await provisionTwilioNumber(businessName, normalizedOwnerPhone)
    if (twilioNumber) {
      await db.from("businesses").update({ twilio_number: twilioNumber }).eq("auth_user_id", userId)
    } else if (process.env.ADMIN_ALERT_PHONE && process.env.TWILIO_INBOUND_TRIGGER_NUMBER) {
      // Provisioning failed silently otherwise — nobody would know a real
      // customer is stuck without a working number until they complain.
      try {
        await client.messages.create({
          to: process.env.ADMIN_ALERT_PHONE,
          from: process.env.TWILIO_INBOUND_TRIGGER_NUMBER,
          body: `ReviewPing: Twilio number provisioning FAILED for "${businessName}" (${email}). Needs a manual number assigned.`,
        })
      } catch (e) {
        console.error("ADMIN ALERT SMS FAILED", e)
      }
    }
  })

  return NextResponse.json({
    ok: true,
    hasSession: !!signUpData.session,
  })
}
