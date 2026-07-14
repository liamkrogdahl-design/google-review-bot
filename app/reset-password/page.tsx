"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { S, focusInput, blurInput } from "@/lib/ui"

// Reached via the link in the password-reset email. Supabase's client
// automatically detects the recovery token in the URL and establishes a
// temporary session — we just need a form to actually set the new password.
export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    // If a recovery session is already present by the time this mounts, allow
    // the form immediately. Otherwise wait for Supabase to finish parsing the
    // token out of the URL and fire this event.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
    setTimeout(() => {
      router.push("/login")
      router.refresh()
    }, 1500)
  }

  return (
    <main style={S.pageCentered}>
      <a href="/" style={S.logo}>ReviewPing</a>

      <div style={S.card}>
        <div style={S.stripe} />
        <div style={S.body}>
          <h2 style={S.h2}>Set a new password</h2>

          {done ? (
            <div style={S.success}>✓ Password updated — redirecting to sign in…</div>
          ) : !ready ? (
            <>
              <p style={S.sub}>Verifying your reset link…</p>
              <p style={{ fontSize: "0.8rem", color: "#3f3f46" }}>
                If this doesn't finish in a few seconds, the link may have expired — request a new one from the sign-in page.
              </p>
            </>
          ) : (
            <form onSubmit={handleSubmit} style={S.form}>
              <label style={S.label}>
                <span style={S.labelText}>New password</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={S.input} onFocus={focusInput} onBlur={blurInput} />
              </label>
              <label style={S.label}>
                <span style={S.labelText}>Confirm new password</span>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required style={S.input} onFocus={focusInput} onBlur={blurInput} />
              </label>

              {error && <div style={S.error}>{error}</div>}

              <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Saving…" : "Set new password →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
