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
4. Owner can see sent/clicked stats on `/dashboard`.

No rating-gating, no routing based on sentiment — v1 sends everyone to Google. See the
note at the bottom on why v2 needs to be built carefully (FTC review-gating rule).

## Setup

1. `npm install`
2. Create a **new** Supabase project (not RingBack's). Run `supabase_migration.sql` in its
   SQL editor.
3. Copy `.env.example` to `.env.local` and fill in:
   - Supabase URL/anon key/service role key from the new project
   - Twilio account SID + auth token (can reuse the same Twilio account as RingBack,
     just use a different phone number)
   - A dedicated Twilio number for the SMS-in trigger (`TWILIO_INBOUND_TRIGGER_NUMBER`)
   - Stripe secret key (test mode to start)
4. In Twilio console, point the inbound-SMS webhook for `TWILIO_INBOUND_TRIGGER_NUMBER` to
   `https://your-app.vercel.app/api/webhooks/twilio-inbound`.
5. `npm run dev`

## Signup flow (not built yet)

There's no `/signup` page yet — for the first few customers, create their `businesses` row
manually in Supabase (set `auth_user_id`, `business_name`, `owner_phone`,
`google_place_id`, `twilio_number`) and send them a password-set link via Supabase auth.
Build a real signup + Stripe Checkout flow once you've validated the manual-onboarding
version with a few customers — same order RingBack likely followed.

## Getting a Google Place ID

Business owner looks theirs up at:
https://developers.google.com/maps/documentation/places/web-service/place-id
(the "Place ID Finder" tool on that page). Paste it into Settings.

## Architecture notes

- `lib/supabaseAdmin.ts` uses the service role key and bypasses RLS — used by API routes
  that act across businesses (send, redirect, inbound webhook). The dashboard pages
  themselves use the regular browser/server clients with RLS enforced.
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

- No signup page (see above) — needed before self-serve growth.
- No Stripe Checkout / webhook for provisioning a business on payment — only the RingBack
  pattern for canceling a subscription is included (`app/api/stripe/cancel`).
- No automated Twilio number purchase per business — currently manual in the Twilio
  console per new customer.
- A2P 10DLC registration isn't code — it's a Twilio console/compliance step, budget
  several days to a couple weeks for carrier approval before relying on deliverability.
