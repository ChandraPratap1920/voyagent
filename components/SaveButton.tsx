'use client'

import { useEffect, useState } from 'react'
import { SavedType } from '@/lib/catalog'

type SavedRow = { item_type: string; item_id: string }

// Save/unsave toggle for one catalog item. Reads its own state client-side so
// the detail page around it stays a static prerender (a server-side session
// read would force it to render per-request).
export default function SaveButton({
  itemType,
  itemId,
  destination,
}: {
  itemType: SavedType
  itemId: string
  destination: string
}) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadSavedState() {
      try {
        const res = await fetch('/api/saved')
        if (!res.ok) throw new Error('not signed in')
        const rows: SavedRow[] = await res.json()
        if (!cancelled) {
          setSaved(rows.some((r) => r.item_type === itemType && r.item_id === itemId))
        }
      } catch {
        if (!cancelled) setSaved(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSavedState()
    return () => {
      cancelled = true
    }
  }, [itemType, itemId])

  async function toggle() {
    if (pending) return
    const next = !saved

    // Optimistic — the button should feel instant.
    setSaved(next)
    setPending(true)

    try {
      const res = next
        ? await fetch('/api/saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_type: itemType, item_id: itemId, destination }),
          })
        : await fetch(
            `/api/saved?item_type=${encodeURIComponent(itemType)}&item_id=${encodeURIComponent(itemId)}`,
            { method: 'DELETE' }
          )

      if (!res.ok) throw new Error('save failed')
    } catch {
      setSaved(!next) // roll back
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || pending}
      aria-pressed={saved}
      className={`w-full rounded-full font-semibold py-3 border transition-colors disabled:opacity-50 ${
        saved
          ? 'bg-rose-500/15 border-rose-400 text-rose-300'
          : 'bg-slate-900 border-slate-700 text-white'
      }`}
    >
      {saved ? '♥ Saved' : '♡ Save this'}
    </button>
  )
}
