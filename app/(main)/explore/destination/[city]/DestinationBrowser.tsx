'use client'

import { useEffect, useState } from 'react'
import ItemCard from '@/components/ItemCard'
import { CatalogItem, ItemKind } from '@/lib/catalog'
import { useSaved } from '@/lib/useSaved'
import { readRememberedItem, restoreItemPosition } from '@/lib/scrollMemory'

const TABS: [ItemKind, string][] = [
  ['hotels', '🏨 Stays'],
  ['restaurants', '🍽️ Eats'],
  ['experiences', '⚡ Things to do'],
]

// Browsable hotels/restaurants/experiences for a single city, reading from the
// same /api routes the Explore tab uses so both stay in sync.
export default function DestinationBrowser({ destination }: { destination: string }) {
  // Seed the tab from whatever the user last opened here. Without this the
  // browser lands on Stay, the remembered restaurant is never in the DOM, and
  // the position is lost.
  const [tab, setTab] = useState<ItemKind>(() => {
    const remembered = readRememberedItem(`dest:${destination}`)?.tab
    return remembered === 'restaurants' || remembered === 'experiences' ? remembered : 'hotels'
  })
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { savedIds, toggle } = useSaved()

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(`/api/${tab}?destination=${encodeURIComponent(destination)}`)
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (!cancelled) setItems(data)
      } catch {
        if (!cancelled) {
          setItems([])
          setError(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    // Guard against an earlier tab's response landing after a newer one.
    return () => {
      cancelled = true
    }
  }, [tab, destination])

  useEffect(() => {
    if (!loading) restoreItemPosition(`dest:${destination}`)
  }, [loading, items, destination, tab])

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-lime-400 text-slate-900'
                : 'bg-slate-900 border border-slate-800 text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {error && !loading && (
        <p className="text-red-400 text-sm">Couldn&apos;t load these right now — try again in a sec.</p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="text-slate-400 text-sm">Nothing curated here yet — check another tab.</p>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            kind={tab}
            item={item}
            saved={savedIds.has(item.id)}
            onToggleSave={(i) => toggle(tab, i)}
            listKey={`dest:${destination}`}
          />
        ))}
      </div>
    </div>
  )
}
