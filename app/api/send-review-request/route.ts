import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { sendReviewRequest } from "@/lib/sendReviewRequest"

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
