"use client"

import { useState, Suspense } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { S, focusInput, blurInput } from "@/lib/ui"

function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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

  return (
    <main style={S.pageCentered}>
      <a href="/" style={S.logo}>ReviewPing</a>

      <div style={S.card}>
        <div style={S.stripe} />
        <div style={S.body}>
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
        </div>
      </div>
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
