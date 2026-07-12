import twilio from "twilio"
import { NextResponse } from "next/server"

/**
 * Validates that an inbound request actually came from Twilio.
 * Call AFTER parsing formData. Pass the already-parsed params and the full request URL.
 * Returns null if valid, or a 403 NextResponse if invalid.
 */
export function validateTwilioSignature(
  url: string,
  signature: string,
  params: Record<string, string>
): NextResponse | null {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    console.error("TWILIO_AUTH_TOKEN not set — skipping validation")
    return null
  }

  const valid = twilio.validateRequest(authToken, signature, url, params)

  if (!valid) {
    console.warn("TWILIO SIGNATURE INVALID", { url })
    return new NextResponse("Forbidden", { status: 403 })
  }

  return null
}
