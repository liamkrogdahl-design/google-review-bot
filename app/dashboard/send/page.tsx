"use client"

import { useState } from "react"
import { S, focusInput, blurInput } from "@/lib/ui"

export default function SendPage() {
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; to?: string; body?: string; error?: string } | null>(null)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch("/api/send-review-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: name, customerPhone: phone }),
      })
      const data = await res.json()
      setResult(res.ok ? { ok: true, ...data } : { ok: false, error: data.error })
    } catch {
      setResult({ ok: false, error: "Network error. Try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={S.pageCentered}>
      <a href="/dashboard" style={S.logo}>ReviewPing</a>

      <div style={S.card}>
        <div style={S.stripe} />
        <div style={S.body}>
          <h2 style={S.h2}>Send a review request</h2>
          <p style={S.sub}>Just finished a job? Send the customer a text asking for a review.</p>

          {result?.ok ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={S.success}>
                <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>✓ Sent to {result.to}</p>
                <p style={{ fontStyle: "italic", opacity: 0.85 }}>&quot;{result.body}&quot;</p>
              </div>
              <button
                onClick={() => { setResult(null); setPhone(""); setName("") }}
                style={S.ghostBtn}
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} style={S.form}>
              <label style={S.label}>
                <span style={S.labelText}>Customer's phone number</span>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(720) 555-1234" required style={S.input} onFocus={focusInput} onBlur={blurInput} />
              </label>

              <label style={S.label}>
                <span style={S.labelText}>Customer name <span style={{ color: "#3f3f46", fontWeight: 400 }}>(optional)</span></span>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Mike" style={S.input} onFocus={focusInput} onBlur={blurInput} />
              </label>

              {result?.error && <div style={S.error}>{result.error}</div>}

              <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Sending…" : "Send review request →"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p style={{ fontSize: "0.8rem", color: "#52525b", marginTop: "1.25rem", textAlign: "center" }}>
        Tip: you can also just text this customer's number to your ReviewPing number instead of using this page.
      </p>
    </main>
  )
}
