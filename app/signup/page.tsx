"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { S, focusInput, blurInput } from "@/lib/ui"

export default function SignupPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [ownerPhone, setOwnerPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{ hasSession: boolean; numberProvisioned: boolean } | null>(null)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, email, password, ownerPhone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong.")
        setLoading(false)
        return
      }
      setResult(data)
      if (data.hasSession) {
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  if (result && !result.hasSession) {
    return (
      <main style={S.pageCentered}>
        <a href="/" style={S.logo}>ReviewPing</a>
        <div style={S.card}>
          <div style={S.stripe} />
          <div style={S.body}>
            <h2 style={S.h2}>Check your email</h2>
            <p style={S.sub}>
              Confirm your account, then sign in. {result.numberProvisioned
                ? "Your dedicated number is already set up."
                : "Your dedicated number is still being set up — check back shortly, or ping support if it's been a while."}
            </p>
            <a href="/login" style={{ ...S.btn, textDecoration: "none", display: "block", textAlign: "center" }}>
              Go to sign in →
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={S.pageCentered}>
      <a href="/" style={S.logo}>ReviewPing</a>

      <div style={S.card}>
        <div style={S.stripe} />
        <div style={S.body}>
          <h2 style={S.h2}>Get started</h2>
          <p style={S.sub}>Set up your account — we'll assign your dedicated texting number automatically.</p>

          <form onSubmit={handleSignup} style={S.form}>
            <label style={S.label}>
              <span style={S.labelText}>Business name</span>
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Apex Plumbing Co." required style={S.input} onFocus={focusInput} onBlur={blurInput} />
            </label>

            <label style={S.label}>
              <span style={S.labelText}>Email</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={S.input} onFocus={focusInput} onBlur={blurInput} />
            </label>

            <label style={S.label}>
              <span style={S.labelText}>Password</span>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={S.input} onFocus={focusInput} onBlur={blurInput} />
            </label>

            <label style={S.label}>
              <span style={S.labelText}>Your cell number</span>
              <input type="tel" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} placeholder="(720) 555-1234" required style={S.input} onFocus={focusInput} onBlur={blurInput} />
              <span style={{ fontSize: "0.72rem", color: "#3f3f46" }}>
                Text this number to trigger review requests without opening the dashboard.
              </span>
            </label>

            {error && <div style={S.error}>{error}</div>}

            <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Setting up your account…" : "Create account →"}
            </button>
          </form>
        </div>
      </div>

      <p style={{ fontSize: "0.8rem", color: "#52525b", marginTop: "1.25rem", textAlign: "center" }}>
        Already have an account? <a href="/login" style={{ color: "#3b82f6", textDecoration: "none" }}>Sign in</a>
      </p>
    </main>
  )
}
