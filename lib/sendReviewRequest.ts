import { client } from "@/lib/twilioClient"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { toE164, fillTemplate } from "@/lib/reviewLink"

// Shared logic used by both the dashboard form (app/api/send-review-request/route.ts)
// and the SMS-in webhook (app/api/webhooks/twilio-inbound/route.ts).
//
// This lives in lib/, not in a route.ts file — Next.js only allows route.ts files
// to export HTTP method handlers (GET/POST/etc.) and a few reserved config names.
// Exporting a plain helper function from a route.ts file fails Next's route type
// check at build time.
export async function sendReviewRequest({
  businessId,
  customerName,
  customerPhone,
}: {
  businessId: string
  customerName: string
  customerPhone: string
}) {
  const db = getSupabaseAdmin()

  const { data: biz } = await db
    .from("businesses")
    .select("business_name, google_place_id, twilio_number, message_template")
    .eq("id", businessId)
    .single()

  if (!biz) throw new Error("Business not found")
  if (!biz.google_place_id) throw new Error("Business has no Google Place ID set — add it in Settings first")
  if (!biz.twilio_number) throw new Error("Business has no Twilio number configured")

  const toPhone = toE164(customerPhone)

  // Insert the row first so we have a requestId to build the tracked link with
  const { data: reqRow, error: insertErr } = await db
    .from("review_requests")
    .insert({
      business_id: businessId,
      customer_name: customerName || null,
      customer_phone: toPhone,
      status: "queued",
    })
    .select()
    .single()

  if (insertErr || !reqRow) throw new Error(insertErr?.message || "Failed to create request")

  // Strip any trailing slash so this never produces a double-slash path like
  // "https://x.vercel.app//r/uuid", which Next's router would fail to match.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "")
  const trackedLink = `${appUrl}/r/${reqRow.id}`
  const body = fillTemplate(biz.message_template, {
    name: customerName,
    business: biz.business_name,
    link: trackedLink,
  })

  try {
    // Strip trailing slash here too — same reasoning as trackedLink above.
    const statusCallback = appUrl ? `${appUrl}/api/webhooks/twilio-status` : undefined

    const msg = await client.messages.create({
      to: toPhone,
      from: biz.twilio_number,
      body,
      ...(statusCallback ? { statusCallback } : {}),
    })

    await db
      .from("review_requests")
      .update({ status: "sent", twilio_sid: msg.sid })
      .eq("id", reqRow.id)

    return { ok: true, to: toPhone, body }
  } catch (e) {
    await db
      .from("review_requests")
      .update({ status: "failed", error_message: e instanceof Error ? e.message : "Unknown error" })
      .eq("id", reqRow.id)
    throw e
  }
}
