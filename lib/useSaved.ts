'use client'

import { useCallback, useEffect, useState } from 'react'
import { CatalogItem, ItemKind, SAVED_TYPE } from './catalog'

// Owns the user's wishlist for a whole list screen: one fetch for the page
// rather than one per card, plus an optimistic toggle so hearts feel instant.
export function useSaved() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/saved')
      const rows: { item_id: string }[] = res.ok ? await res.json() : []
      setSavedIds(new Set(rows.map((r) => r.item_id)))
    } catch {
      setSavedIds(new Set())
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    // Inlined rather than calling refresh() directly: the lint rule flags a
    // synchronous setState reached from an effect body, and this also lets us
    // drop a response that lands after unmount.
    async function load() {
      try {
        const res = await fetch('/api/saved')
        const rows: { item_id: string }[] = res.ok ? await res.json() : []
        if (!cancelled) setSavedIds(new Set(rows.map((r) => r.item_id)))
      } catch {
        if (!cancelled) setSavedIds(new Set())
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = useCallback(
    async (kind: ItemKind, item: CatalogItem) => {
      const wasSaved = savedIds.has(item.id)

      // Optimistic — revert below if the request fails.
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.delete(item.id)
        else next.add(item.id)
        return next
      })

      try {
        const itemType = SAVED_TYPE[kind]
        const res = wasSaved
          ? await fetch(
              `/api/saved?item_type=${encodeURIComponent(itemType)}&item_id=${encodeURIComponent(item.id)}`,
              { method: 'DELETE' }
            )
          : await fetch('/api/saved', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                item_type: itemType,
                item_id: item.id,
                destination: item.destination,
              }),
            })
        if (!res.ok) throw new Error('save failed')
      } catch {
        setSavedIds((prev) => {
          const next = new Set(prev)
          if (wasSaved) next.add(item.id)
          else next.delete(item.id)
          return next
        })
      }
    },
    [savedIds]
  )

  return { savedIds, toggle, refresh, loaded }
}
