import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripeClient"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  let userId: string | null = null
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch { /* */ }

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = getSupabaseAdmin()
  const { data: biz } = await db
    .from("businesses")
    .select("stripe_subscription_id, business_name")
    .eq("auth_user_id", userId)
    .single() as { data: { stripe_subscription_id: string | null; business_name: string } | null }

  if (!biz?.stripe_subscription_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 })
  }

  await stripe.subscriptions.update(biz.stripe_subscription_id, {
    cancel_at_period_end: true,
  })

  return NextResponse.json({ ok: true })
}
