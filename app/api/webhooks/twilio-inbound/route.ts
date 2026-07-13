import { NextRequest, NextResponse } from "next/server"
import { client } from "@/lib/twilioClient"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { validateTwilioSignature } from "@/lib/twilioValidate"
import { sendReviewRequest } from "@/lib/sendReviewRequest"
import { toE164 } from "@/lib/reviewLink"

// SMS-in trigger: the business owner texts their own dashboard number with
// "5551234567 Mike" and this fires off the review request — no login, no bookmark.
//
// A single shared Twilio number handles inbound triggers for every business;
// we identify which business is texting by matching the From number against
// businesses.owner_phone. Each business still gets its own dedicated
// twilio_number for the OUTBOUND review text (branding/deliverability).
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const params: Record<string, string> = {}
  formData.forEach((value, key) => { params[key] = String(value) })

  const signature = req.headers.get("x-twilio-signature") || ""
  const invalid = validateTwilioSignature(req.url, signature, params)
  if (invalid) return invalid

  const from = params.From
  const bodyText = (params.Body || "").trim()

  const db = getSupabaseAdmin()
  const { data: biz } = await db
    .from("businesses")
    .select("id")
    .eq("owner_phone", from)
    .single()

  const reply = (message: string) =>
    client.messages.create({
      to: from,
      from: process.env.TWILIO_INBOUND_TRIGGER_NUMBER!,
      body: message,
    })

  if (!biz) {
    await reply("This number isn't registered to a ReviewPing account. Text support if you think this is a mistake.")
    return new NextResponse("", { status: 200 })
  }

  // Expect "<10-digit phone> <optional name>"
  const match = bodyText.match(/(\+?1?\d{10})\s*(.*)/)
  if (!match) {
    await reply("Couldn't find a phone number in that text. Send it like: 5551234567 Mike")
    return new NextResponse("", { status: 200 })
  }

  const customerPhone = toE164(match[1])
  const customerName = match[2]?.trim() || ""

  try {
    await sendReviewRequest({ businessId: biz.id, customerName, customerPhone })
    await reply(`Review request sent to ${customerName || customerPhone} ✅`)
  } catch (e) {
    await reply(`Couldn't send that one: ${e instanceof Error ? e.message : "unknown error"}`)
  }

  return new NextResponse("", { status: 200 })
}
