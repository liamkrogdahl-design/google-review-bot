import { NextRequest, NextResponse } from "next/server"
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

export async function POST(req: NextRequest) {
  const { businessName, email, password, ownerPhone } = await req.json()

  if (!businessName || !email || !password || !ownerPhone) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }

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

  // Provision the dedicated outbound number in the background-ish — we still
  // await it so we can report status, but signup itself already succeeded
  // above regardless of whether this part works.
  const twilioNumber = await provisionTwilioNumber(businessName, normalizedOwnerPhone)
  if (twilioNumber) {
    await db.from("businesses").update({ twilio_number: twilioNumber }).eq("auth_user_id", userId)
  }

  return NextResponse.json({
    ok: true,
    hasSession: !!signUpData.session,
    numberProvisioned: !!twilioNumber,
  })
}
