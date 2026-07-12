import type { CSSProperties } from "react"

// Shared dark-theme style tokens, matching RingBack's look, so both
// products feel like the same company without sharing any code between them.
export const S: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#09090b",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "3rem 1.25rem",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
    WebkitFontSmoothing: "antialiased",
  },
  pageCentered: {
    minHeight: "100vh",
    background: "#09090b",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1.25rem",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
    WebkitFontSmoothing: "antialiased",
  },
  logo: {
    fontSize: "1.15rem",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#fff",
    marginBottom: "2.5rem",
    opacity: 0.9,
    textDecoration: "none",
    display: "block",
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    background: "#111113",
    border: "1px solid #1f1f23",
    borderRadius: "18px",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
  },
  wideCard: {
    width: "100%",
    maxWidth: "760px",
    background: "#111113",
    border: "1px solid #1f1f23",
    borderRadius: "18px",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
  },
  stripe: { height: "2px", background: "linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa)" },
  body: { padding: "2rem" },
  h2: { fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.3rem" },
  sub: { fontSize: "0.875rem", color: "#71717a", marginBottom: "1.75rem" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  label: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  labelText: { fontSize: "0.8rem", fontWeight: 500, color: "#a1a1aa", letterSpacing: "0.01em" },
  input: {
    width: "100%",
    background: "#0d0d10",
    border: "1px solid #27272a",
    borderRadius: "8px",
    padding: "0.7rem 0.875rem",
    fontSize: "0.9rem",
    color: "#fff",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  btn: {
    width: "100%",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    padding: "0.875rem",
    borderRadius: "10px",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "0.25rem",
    boxShadow: "0 4px 16px rgba(59,130,246,0.25)",
    transition: "background 0.15s",
    letterSpacing: "-0.01em",
  },
  ghostBtn: {
    background: "#1f1f23",
    border: "1px solid #27272a",
    color: "#a1a1aa",
    padding: "0.75rem",
    borderRadius: "10px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  error: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: "8px",
    padding: "0.7rem 0.9rem",
    fontSize: "0.85rem",
    color: "#f87171",
  },
  success: {
    background: "rgba(34,197,94,0.08)",
    border: "1px solid rgba(34,197,94,0.25)",
    borderRadius: "8px",
    padding: "0.7rem 0.9rem",
    fontSize: "0.85rem",
    color: "#4ade80",
  },
}

export function focusInput(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "#3b82f6"
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)"
}
export function blurInput(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "#27272a"
  e.currentTarget.style.boxShadow = "none"
}
