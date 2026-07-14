import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { validateTwilioSignature } from "@/lib/twilioValidate"

// Twilio calls this as a message's delivery status changes (queued -> sent ->
// delivered / undelivered / failed). Lets the dashboard show real delivery
// outcomes instead of just "we successfully called the API."
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const params: Record<string, string> = {}
  formData.forEach((value, key) => { params[key] = String(value) })

  const signature = req.headers.get("x-twilio-signature") || ""
  const invalid = validateTwilioSignature(req.url, signature, params)
  if (invalid) return invalid

  const messageSid = params.MessageSid
  const messageStatus = params.MessageStatus // queued, sent, delivered, undelivered, failed
  const errorCode = params.ErrorCode

  if (!messageSid || !messageStatus) {
    return new NextResponse("", { status: 200 })
  }

  const db = getSupabaseAdmin()
  await db
    .from("review_requests")
    .update({
      status: messageStatus,
      ...(errorCode ? { error_message: `Twilio error ${errorCode}` } : {}),
    })
    .eq("twilio_sid", messageSid)

  return new NextResponse("", { status: 200 })
}
