-- ReviewPing v1 schema
-- Run this in the Supabase SQL editor on a NEW project (do not run against RingBack's project)

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) not null,
  business_name text not null,
  owner_phone text not null,              -- the plumber's own cell, used to identify who's texting the SMS-in trigger
  google_place_id text,                   -- used to build the "write a review" deep link
  twilio_number text,                     -- dedicated outbound number for this business (branding/deliverability)
  message_template text not null default 'Hi {name}, thanks for choosing {business}! Mind leaving us a quick review? {link}',
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_status text not null default 'trialing',  -- trialing | active | past_due | canceled
  created_at timestamptz not null default now()
);

create unique index if not exists businesses_owner_phone_idx on businesses (owner_phone);

create table if not exists review_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) not null,
  customer_name text,
  customer_phone text not null,
  status text not null default 'queued',   -- queued | sent | delivered | failed
  twilio_sid text,
  error_message text,
  review_link_clicked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists review_requests_business_idx on review_requests (business_id);

-- Row Level Security: a business can only see its own requests
alter table businesses enable row level security;
alter table review_requests enable row level security;

create policy "businesses_select_own" on businesses
  for select using (auth.uid() = auth_user_id);

create policy "businesses_update_own" on businesses
  for update using (auth.uid() = auth_user_id);

create policy "review_requests_select_own" on review_requests
  for select using (
    business_id in (select id from businesses where auth_user_id = auth.uid())
  );
