"use client"

import { useEffect, useState } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { S, focusInput, blurInput } from "@/lib/ui"

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState("")
  const [placeId, setPlaceId] = useState("")
  const [ownerPhone, setOwnerPhone] = useState("")
  const [template, setTemplate] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("businesses")
        .select("business_name, google_place_id, owner_phone, message_template")
        .eq("auth_user_id", user.id)
        .single()
      if (data) {
        setBusinessName(data.business_name || "")
        setPlaceId(data.google_place_id || "")
        setOwnerPhone(data.owner_phone || "")
        setTemplate(data.message_template || "")
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from("businesses")
      .update({
        business_name: businessName,
        google_place_id: placeId,
        owner_phone: ownerPhone,
        message_template: template,
      })
      .eq("auth_user_id", user.id)
    setSaving(false)
    setSaved(true)
  }

  if (loading) return <main style={S.pageCentered}><p style={{ color: "#71717a" }}>Loading…</p></main>

  return (
    <main style={S.pageCentered}>
      <a href="/dashboard" style={S.logo}>ReviewPing</a>

      <div style={S.card}>
        <div style={S.stripe} />
        <div style={S.body}>
          <h2 style={S.h2}>Settings</h2>
          <p style={S.sub}>Your Google Place ID controls where the review link sends customers.</p>

          <form onSubmit={handleSave} style={S.form}>
            <label style={S.label}>
              <span style={S.labelText}>Business name</span>
              <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} style={S.input} onFocus={focusInput} onBlur={blurInput} />
            </label>

            <label style={S.label}>
              <span style={S.labelText}>Google Place ID</span>
              <input type="text" value={placeId} onChange={e => setPlaceId(e.target.value)} placeholder="ChIJ..." style={S.input} onFocus={focusInput} onBlur={blurInput} />
              <span style={{ fontSize: "0.72rem", color: "#3f3f46" }}>
                Find yours at developers.google.com/maps/documentation/places/web-service/place-id
              </span>
            </label>

            <label style={S.label}>
              <span style={S.labelText}>Your phone (for texting in requests)</span>
              <input type="tel" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} placeholder="(720) 555-1234" style={S.input} onFocus={focusInput} onBlur={blurInput} />
              <span style={{ fontSize: "0.72rem", color: "#3f3f46" }}>
                Text this to your ReviewPing number to trigger a send without opening the dashboard.
              </span>
            </label>

            <label style={S.label}>
              <span style={S.labelText}>Message template</span>
              <textarea
                value={template}
                onChange={e => setTemplate(e.target.value)}
                rows={3}
                style={{ ...S.input, resize: "vertical" as const, fontFamily: "inherit" }}
                onFocus={focusInput}
                onBlur={blurInput}
              />
              <span style={{ fontSize: "0.72rem", color: "#3f3f46" }}>
                Use {"{name}"}, {"{business}"}, and {"{link}"} as placeholders.
              </span>
            </label>

            {saved && <div style={S.success}>✓ Saved</div>}

            <button type="submit" disabled={saving} style={{ ...S.btn, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
