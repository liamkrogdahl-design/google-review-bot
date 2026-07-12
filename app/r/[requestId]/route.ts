import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { googleWriteReviewUrl } from "@/lib/reviewLink"

// The tracked link every review-request text points to.
// Logs the click, then redirects straight into Google's write-a-review box.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params
  const db = getSupabaseAdmin()

  const { data: reqRow } = await db
    .from("review_requests")
    .select("id, business_id, review_link_clicked_at")
    .eq("id", requestId)
    .single()

  if (!reqRow) {
    return NextResponse.redirect("https://google.com")
  }

  // Only stamp the first click
  if (!reqRow.review_link_clicked_at) {
    await db
      .from("review_requests")
      .update({ review_link_clicked_at: new Date().toISOString() })
      .eq("id", requestId)
  }

  const { data: biz } = await db
    .from("businesses")
    .select("google_place_id")
    .eq("id", reqRow.business_id)
    .single()

  if (!biz?.google_place_id) {
    return NextResponse.redirect("https://google.com")
  }

  return NextResponse.redirect(googleWriteReviewUrl(biz.google_place_id))
}
