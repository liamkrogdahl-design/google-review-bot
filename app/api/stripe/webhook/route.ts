import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripeClient"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import Stripe from "stripe"

// Keeps businesses.plan_status in sync with the actual subscription state in
// Stripe. Configure this URL as a webhook endpoint in the Stripe dashboard
// listening for: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted.
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get("stripe-signature") || ""

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e) {
    console.error("STRIPE WEBHOOK SIGNATURE INVALID", e)
    return new NextResponse("Invalid signature", { status: 400 })
  }

  const db = getSupabaseAdmin()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        await db
          .from("businesses")
          .update({ stripe_subscription_id: subscriptionId, plan_status: "active" })
          .eq("stripe_customer_id", customerId)
        break
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        await db
          .from("businesses")
          .update({ plan_status: subscription.status })
          .eq("stripe_customer_id", customerId)
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        await db
          .from("businesses")
          .update({ plan_status: "canceled" })
          .eq("stripe_customer_id", customerId)
        break
      }
      default:
        // Ignore events we don't care about
        break
    }
  } catch (e) {
    console.error("STRIPE WEBHOOK HANDLING FAILED", e)
    // Still return 200 — Stripe retries on non-2xx, and a DB hiccup here
    // shouldn't cause Stripe to keep hammering this endpoint indefinitely.
    // The next subscription event will re-sync state anyway.
  }

  return NextResponse.json({ received: true })
}
