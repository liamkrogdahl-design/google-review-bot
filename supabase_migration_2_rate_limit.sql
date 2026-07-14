-- ReviewPing: signup rate limiting
-- Run this after supabase_migration.sql on the same project.

create table if not exists signup_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists signup_attempts_ip_idx on signup_attempts (ip, created_at);

-- Only the service role ever touches this table (no anon/authenticated access needed)
alter table signup_attempts enable row level security;
