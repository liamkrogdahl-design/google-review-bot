"use client"

import { useState, Suspense } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { S, focusInput, blurInput } from "@/lib/ui"

function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "reset">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Incorrect email or password.")
      setLoading(false)
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setResetSent(true)
  }

  return (
    <main style={S.pageCentered}>
      <a href="/" style={S.logo}>ReviewPing</a>

      <div style={S.card}>
        <div style={S.stripe} />
        <div style={S.body}>
          {mode === "login" ? (
            <>
              <h2 style={S.h2}>Welcome back</h2>
              <p style={S.sub}>Sign in to your dashboard.</p>

              <form onSubmit={handleLogin} style={S.form}>
                <label style={S.label}>
                  <span style={S.labelText}>Email</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={S.input} onFocus={focusInput} onBlur={blurInput} />
                </label>
                <label style={S.label}>
                  <span style={S.labelText}>Password</span>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={S.input} onFocus={focusInput} onBlur={blurInput} />
                </label>

                {error && <div style={S.error}>{error}</div>}

                <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "Signing in…" : "Sign in →"}
                </button>
              </form>

              <button
                onClick={() => { setMode("reset"); setError(""); setResetSent(false) }}
                style={{ background: "none", border: "none", color: "#52525b", fontSize: "0.85rem", cursor: "pointer", width: "100%", textAlign: "center", marginTop: "1rem", padding: "0.4rem", fontFamily: "inherit" }}
              >
                Forgot password?
              </button>
            </>
          ) : (
            <>
              <h2 style={S.h2}>Reset password</h2>
              <p style={S.sub}>Enter your email — we'll send you a link to set a new password.</p>

              {resetSent ? (
                <div style={S.success}>✓ Check your email for a reset link.</div>
              ) : (
                <form onSubmit={handleReset} style={S.form}>
                  <label style={S.label}>
                    <span style={S.labelText}>Email</span>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={S.input} onFocus={focusInput} onBlur={blurInput} />
                  </label>

                  {error && <div style={S.error}>{error}</div>}

                  <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "Sending…" : "Send reset link"}
                  </button>
                </form>
              )}

              <button
                onClick={() => { setMode("login"); setError(""); setResetSent(false) }}
                style={{ background: "none", border: "none", color: "#52525b", fontSize: "0.85rem", cursor: "pointer", width: "100%", textAlign: "center", marginTop: "1rem", padding: "0.4rem", fontFamily: "inherit" }}
              >
                ← Back to sign in
              </button>
            </>
          )}
        </div>
      </div>

      <p style={{ fontSize: "0.8rem", color: "#52525b", marginTop: "1.25rem", textAlign: "center" }}>
        Don't have an account? <a href="/signup" style={{ color: "#3b82f6", textDecoration: "none" }}>Get started</a>
      </p>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
