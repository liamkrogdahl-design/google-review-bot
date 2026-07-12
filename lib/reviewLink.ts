// Builds the Google "write a review" deep link from a Place ID.
// This opens the review box directly instead of the general Maps listing.
export function googleWriteReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
}

// Normalizes any US phone input to E.164 (+1XXXXXXXXXX).
export function toE164(phone: string): string {
  const digits = String(phone).replace(/\D/g, "")
  const tenDigit = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.slice(-10)
  return `+1${tenDigit}`
}

export function fillTemplate(template: string, vars: { name: string; business: string; link: string }): string {
  return template
    .replace(/\{name\}/g, vars.name || "there")
    .replace(/\{business\}/g, vars.business)
    .replace(/\{link\}/g, vars.link)
}
