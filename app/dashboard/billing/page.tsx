"use client"

import { useEffect, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { S } from "@/lib/ui"

const STATUS_LABELS: Record<string, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Payment past due",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Incomplete (expired)",
  unpaid: "Unpaid",
}

export default function BillingPage() {
  const [planStatus, setPlanStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState("")
  const [canceled, setCanceled] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("businesses")
        .select("plan_status")
        .eq("auth_user_id", user.id)
        .single()
      setPlanStatus(data?.plan_status || null)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubscribe() {
    setError("")
    setActionLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error || "Couldn't start checkout.")
        setActionLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError("Network error. Try again.")
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    setError("")
    setActionLoading(true)
    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Couldn't cancel subscription.")
        setActionLoading(false)
        return
      }
      setCanceled(true)
    } catch {
      setError("Network error. Try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const isActive = planStatus === "active"

  return (
    <main style={S.pageCentered}>
      <a href="/dashboard" style={S.logo}>ReviewPing</a>

      <div style={S.card}>
        <div style={S.stripe} />
        <div style={S.body}>
          <h2 style={S.h2}>Billing</h2>

          {loading ? (
            <p style={S.sub}>Loading…</p>
          ) : (
            <>
              <p style={S.sub}>
                Current plan: <strong style={{ color: "#fff" }}>{STATUS_LABELS[planStatus || ""] || planStatus || "Unknown"}</strong>
              </p>

              {canceled && (
                <div style={{ ...S.success, marginBottom: "1rem" }}>
                  Subscription set to cancel at the end of your billing period.
                </div>
              )}

              {error && <div style={{ ...S.error, marginBottom: "1rem" }}>{error}</div>}

              {isActive ? (
                <button
                  onClick={handleCancel}
                  disabled={actionLoading || canceled}
                  style={{ ...S.ghostBtn, width: "100%", opacity: actionLoading ? 0.6 : 1 }}
                >
                  {actionLoading ? "Working…" : canceled ? "Cancellation scheduled" : "Cancel subscription"}
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={actionLoading}
                  style={{ ...S.btn, opacity: actionLoading ? 0.6 : 1 }}
                >
                  {actionLoading ? "Redirecting…" : "Subscribe →"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
