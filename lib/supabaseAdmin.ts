import { createClient } from "@supabase/supabase-js"

// Server-only client using the service role key — bypasses RLS.
// Used by API routes (send, redirect, inbound webhook) that need to
// read/write across businesses without a logged-in user session.
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
