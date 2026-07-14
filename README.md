# ReviewPing — v1 MVP

Automated review-request texting for local businesses. This is a standalone project — it
does not share a database, Twilio account, or any code with RingBack. Patterns (Supabase
auth, Twilio client, dark-theme UI) were modeled on RingBack's approach but rewritten fresh
here so RingBack itself was never touched.

## What v1 does

1. Business owner sends a review request two ways:
   - Opens `/dashboard/send`, types the customer's name + phone, hits send.
   - Texts their ReviewPing number: `5551234567 Mike` (no login needed).
2. Customer gets a text with a tracked link (`/r/[requestId]`).
3. Customer taps it, we log the click, then redirect straight into Google's
   "write a review" box for that business's Place ID.
4. Owner can see sent/clicked/delivered stats on `/dashboard`.

No rating-gating, no routing based on sentiment — v1 sends everyone to Google. See the
note at the bottom on why v2 needs to be built carefully (FTC review-gating rule).

## Setup

1. `npm install`
2. Create a **new** Supabase project (not RingBack's). Run, in order, in its SQL editor:
   `supabase_migration.sql`, `supabase_migration_2_rate_limit.sql`,
   `supabase_migration_3_stripe_index.sql`.
3. Copy `.env.example` to `.env.local` and fill in:
   - Supabase URL/anon key/service role key from the new project
   - Twilio account SID + auth token (can reuse the same Twilio account as RingBack,
     just use different phone numbers)
   - A dedicated Twilio number for the SMS-in trigger (`TWILIO_INBOUND_TRIGGER_NUMBER`)
   - `ADMIN_ALERT_PHONE` — your own cell, texted if a signup's number provisioning fails
   - Stripe secret key + webhook secret + `STRIPE_PRICE_ID` (see Billing below)
4. In Twilio console, point the inbound-SMS webhook for `TWILIO_INBOUND_TRIGGER_NUMBER` to
   `https://your-app.vercel.app/api/webhooks/twilio-inbound`.
5. `npm run dev`

## Signup flow

`/signup` creates the Supabase auth user, inserts the `businesses` row, and automatically
purchases a dedicated Twilio number for the new business (`app/api/signup/route.ts`).

**Rate limiting.** Every signup spends real money (the Twilio purchase below), so signups
are capped at 3 per IP per hour (`signup_attempts` table) before any account or Twilio work
happens. A legitimate user signing up once will never hit this; it exists to stop bots or
repeated accidental submissions from racking up real charges.

**Automatic number purchase.** It uses the same Twilio account as RingBack (that's just an
account-level credential, shared on purpose), but it can never touch or modify any existing
number — the code only ever calls `availablePhoneNumbers.list()` (read-only search) and
`incomingPhoneNumbers.create()` (buys a brand new number resource), never `.list()`/
`.update()` on numbers that already exist. So even sharing the account, there's no code path
that can reach RingBack's numbers. Costs ~$1/month per number, billed automatically.

**Reliability.** The number purchase is deferred with Next's `after()` so the signup
response never waits on it — two sequential Twilio API calls could otherwise push past
Vercel's serverless function time limit (10s on the Hobby plan) and fail signup entirely
even though the account was already created. If provisioning fails for any reason, the
business just has `twilio_number = null`, the dashboard shows a "still being set up"
banner, and (if `ADMIN_ALERT_PHONE` is set) you get a text so it never goes unnoticed.

## Password reset

Uses Supabase's built-in `resetPasswordForEmail` — no custom SMS infrastructure needed.
"Forgot password?" on `/login` sends an email with a link to `/reset-password`, which
detects the recovery session automatically and lets the user set a new password.

## Delivery status tracking

Outbound messages include a `statusCallback` pointing at
`/api/webhooks/twilio-status`, which Twilio calls as a message's real delivery status
changes (queued → sent → delivered / undelivered / failed). `review_requests.status`
reflects the actual outcome, not just "we successfully called the Twilio API" — the
dashboard color-codes delivered (green) vs undelivered/failed (red).

## Billing

Stripe Checkout + webhook are wired up (`app/api/stripe/checkout`,
`app/api/stripe/webhook`, `app/dashboard/billing`). To activate:

1. In the Stripe dashboard, create a Product with a recurring monthly Price — copy its
   Price ID into `STRIPE_PRICE_ID`.
2. Add a webhook endpoint pointing at `https://your-app.vercel.app/api/stripe/webhook`,
   listening for `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
3. The `/dashboard/billing` page shows the current plan status and lets a business
   subscribe (redirects to Stripe Checkout) or cancel (schedules cancellation at period
   end, via the existing `app/api/stripe/cancel`).

**Note:** billing plumbing is built, but nothing currently blocks sending review requests
if a business's `plan_status` isn't `active` — that's a deliberate choice left to you. New
signups default to `trialing`. Decide when/whether to actually gate `/api/send-review-request`
and the SMS-in webhook on `plan_status`, since that's a product policy decision (how long a
free trial should be, what happens after it ends), not just a code change.

## Getting a Google Place ID

Business owner looks theirs up at:
https://developers.google.com/maps/documentation/places/web-service/place-id
(the "Place ID Finder" tool on that page). Paste it into Settings.

## Architecture notes

- `lib/supabaseAdmin.ts` uses the service role key and bypasses RLS — used by API routes
  that act across businesses (send, redirect, inbound webhook, signup). The dashboard
  pages themselves use the regular browser/server clients with RLS enforced.
- `lib/sendReviewRequest.ts` holds the shared send logic, reused by both the dashboard
  form's API route and the SMS-in webhook — one code path, two triggers. It lives in
  `lib/`, not a `route.ts` file, because Next.js only allows route files to export
  HTTP method handlers (GET/POST/etc.), not arbitrary helper functions.
- `app/r/[requestId]/route.ts` is the only link ever sent to a customer. Never send the
  raw Google URL directly — routing through this lets you measure click-through.

## Before you charge anyone: the v2 legal issue

The original pitch was: ask "how'd we do, 1-5?", route 4-5s to Google, route 1-3s privately.
That's "review gating," and the FTC's Consumer Review Rule (effective Oct 2024, 16 CFR
Part 465) makes it illegal to selectively solicit public reviews based on predicted or
actual sentiment — penalties run up to ~$53k per violation. Google's own review policies
separately prohibit it too.

A compliant version of the same idea: always show both a "leave a private note" option and
the Google review button on the same page, for every customer, regardless of rating. You
still catch unhappy customers early (they tend to pick the private option), you're just not
gatekeeping who gets asked publicly. Build this as its own follow-up, not by branching on
the rating value before deciding what to send.

## Known gaps in this scaffold

- Billing isn't enforced — see the note under Billing above. Anyone can use the product
  regardless of `plan_status` until you decide to gate it.
- No auto-reply on the per-business outbound number — if a customer replies to their
  review-request text, nothing happens (no webhook is configured on that number). Fine for
  v1, but a nice follow-up once volume is real.
- A2P 10DLC registration isn't code — it's a Twilio console/compliance step, budget
  several days to a couple weeks for carrier approval before relying on deliverability.
  This applies per number, including every auto-purchased one — worth checking whether
  newly purchased numbers inherit your account-level registration automatically or need
  each one added individually, since that affects real deliverability at scale.
- The signup rate limit (3/hour/IP) is a blunt instrument — it stops obvious abuse but a
  patient attacker spread across many IPs wouldn't be slowed down. Fine for an MVP with low
  signup volume; revisit if abuse actually shows up.
