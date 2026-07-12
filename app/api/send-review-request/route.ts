import { NextRequest, NextResponse } from "next/server"
import { client } from "@/lib/twilioClient"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { toE164, fillTemplate } from "@/lib/reviewLink"

// Shared logic used by both the dashboard form and the SMS-in webhook.
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

  const trackedLink = `${process.env.NEXT_PUBLIC_APP_URL}/r/${reqRow.id}`
  const body = fillTemplate(biz.message_template, {
    name: customerName,
    business: biz.business_name,
    link: trackedLink,
  })

  try {
    const msg = await client.messages.create({
      to: toPhone,
      from: biz.twilio_number,
      body,
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

export async function POST(req: NextRequest) {
  // Called from the logged-in dashboard — auth via Supabase session cookie
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = getSupabaseAdmin()
  const { data: biz } = await db
    .from("businesses")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!biz) return NextResponse.json({ error: "No business found for this account" }, { status: 404 })

  try {
    const { customerName, customerPhone } = await req.json()
    if (!customerPhone) return NextResponse.json({ error: "customerPhone is required" }, { status: 400 })

    const result = await sendReviewRequest({
      businessId: biz.id,
      customerName,
      customerPhone,
    })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 })
  }
}
