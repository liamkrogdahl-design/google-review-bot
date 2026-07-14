-- ReviewPing: index for Stripe webhook lookups
-- Run this after the previous migrations on the same project.

create index if not exists businesses_stripe_customer_idx on businesses (stripe_customer_id);
