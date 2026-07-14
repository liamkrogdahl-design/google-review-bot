import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripeClient"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.STRIPE_PRICE_ID) {
    return NextResponse.json({ error: "Billing isn't configured yet (missing STRIPE_PRICE_ID)" }, { status: 500 })
  }

  const db = getSupabaseAdmin()
  const { data: biz } = await db
    .from("businesses")
    .select("id, business_name, stripe_customer_id")
    .eq("auth_user_id", user.id)
    .single()

  if (!biz) return NextResponse.json({ error: "No business found for this account" }, { status: 404 })

  // Reuse an existing Stripe customer if we already made one, otherwise create it now.
  let customerId = biz.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: biz.business_name,
      metadata: { business_id: biz.id },
    })
    customerId = customer.id
    await db.from("businesses").update({ stripe_customer_id: customerId }).eq("id", biz.id)
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "")

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?success=true`,
    cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
  })

  return NextResponse.json({ url: session.url })
}
