import { S } from "@/lib/ui"

export default function HomePage() {
  return (
    <main style={S.pageCentered}>
      <span style={S.logo}>ReviewPing</span>
      <div style={S.card}>
        <div style={S.stripe} />
        <div style={S.body}>
          <h2 style={S.h2}>Get more Google reviews on autopilot</h2>
          <p style={S.sub}>
            Text your customer after every job. They tap one link, land straight in your Google review box.
          </p>
          <a href="/login" style={{ ...S.btn, textDecoration: "none", display: "block", textAlign: "center" }}>
            Sign in →
          </a>
        </div>
      </div>
    </main>
  )
}
