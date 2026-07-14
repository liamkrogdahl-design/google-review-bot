import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { redirect } from "next/navigation"
import { S } from "@/lib/ui"

function statusColor(status: string): string {
  if (status === "delivered") return "#4ade80"
  if (status === "failed" || status === "undelivered") return "#f87171"
  return "#a1a1aa" // queued, sent, or anything else in transit
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = getSupabaseAdmin()
  const { data: biz } = await db
    .from("businesses")
    .select("id, business_name, google_place_id, twilio_number")
    .eq("auth_user_id", user.id)
    .single()

  const { data: requests } = biz
    ? await db
        .from("review_requests")
        .select("id, customer_name, customer_phone, status, review_link_clicked_at, created_at")
        .eq("business_id", biz.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] }

  const sent = requests?.length ?? 0
  const clicked = requests?.filter(r => r.review_link_clicked_at).length ?? 0
  const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0

  return (
    <main style={S.page}>
      <a href="/dashboard" style={S.logo}>ReviewPing</a>

      <div style={S.wideCard}>
        <div style={S.stripe} />
        <div style={S.body}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h2 style={S.h2}>{biz?.business_name || "Your business"}</h2>
              <p style={{ ...S.sub, marginBottom: 0 }}>
                {sent} sent · {clicked} clicked ({clickRate}%)
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <a href="/dashboard/billing" style={{ ...S.ghostBtn, textDecoration: "none", display: "inline-block" }}>Billing</a>
              <a href="/dashboard/settings" style={{ ...S.ghostBtn, textDecoration: "none", display: "inline-block" }}>Settings</a>
              <a href="/dashboard/send" style={{ ...S.btn, textDecoration: "none", display: "inline-block", width: "auto", marginTop: 0 }}>Send request →</a>
            </div>
          </div>

          {!biz?.twilio_number && (
            <div style={{ ...S.error, marginBottom: "1.25rem" }}>
              Your dedicated texting number is still being set up — check back shortly, or contact support if it's been a while.
            </div>
          )}

          {biz?.twilio_number && process.env.TWILIO_INBOUND_TRIGGER_NUMBER && (
            <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "10px", padding: "1rem 1.1rem", marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#93c5fd", marginBottom: "0.3rem" }}>
                How to send a request without opening this page
              </p>
              <p style={{ fontSize: "0.82rem", color: "#a1a1aa" }}>
                Text a customer's number to <strong style={{ color: "#fff" }}>{process.env.TWILIO_INBOUND_TRIGGER_NUMBER}</strong> — e.g. &quot;5551234567 Mike&quot; — and we&apos;ll send them a review request automatically.
                Their review request text will come from your dedicated number, <strong style={{ color: "#fff" }}>{biz.twilio_number}</strong>.
              </p>
            </div>
          )}

          {!biz?.google_place_id && (
            <div style={{ ...S.error, marginBottom: "1.25rem" }}>
              No Google Place ID set — review requests won&apos;t work until you add one in Settings.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {(!requests || requests.length === 0) && (
              <p style={{ color: "#52525b", fontSize: "0.875rem", textAlign: "center", padding: "2rem 0" }}>
                No review requests sent yet.
              </p>
            )}
            {requests?.map(r => (
              <div key={r.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.85rem 1rem", background: "#0d0d10", border: "1px solid #1f1f23", borderRadius: "10px",
              }}>
                <div>
                  <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>{r.customer_name || "Unnamed"}</p>
                  <p style={{ fontSize: "0.78rem", color: "#71717a" }}>{r.customer_phone}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "0.78rem", color: statusColor(r.status), textTransform: "capitalize" }}>{r.status}</p>
                  <p style={{ fontSize: "0.72rem", color: r.review_link_clicked_at ? "#4ade80" : "#3f3f46" }}>
                    {r.review_link_clicked_at ? "✓ clicked" : "not clicked"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
