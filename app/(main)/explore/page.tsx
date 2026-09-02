'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import destinations from '@/data/destinations.json'
import ItemCard from '@/components/ItemCard'
import { CatalogItem, ItemKind } from '@/lib/catalog'
import type { SortKey } from '@/lib/filters'
import { useSaved } from '@/lib/useSaved'
import { restoreItemPosition } from '@/lib/scrollMemory'

// Chips come straight from the dataset so adding a city later updates
// Explore, Home, and the destination pages together.
const DESTINATIONS = destinations.map((d) => ({ slug: d.slug, name: d.name }))

type Tab = ItemKind | 'saved'

const TABS: [Tab, string][] = [
  ['hotels', '🏨 Hotels'],
  ['restaurants', '🍽️ Restaurants'],
  ['experiences', '⚡ Experiences'],
  ['saved', '❤️ Wanderlist'],
]

const RATING_OPTIONS: [number, string][] = [
  [4, '4.0+'],
  [4.3, '4.3+'],
  [4.5, '4.5+'],
]

const PRICE_OPTIONS: [number, string][] = [
  [1, '₹'],
  [2, '₹₹'],
  [3, '₹₹₹'],
  [4, '₹₹₹₹'],
]

const SORT_OPTIONS: [SortKey, string][] = [
  ['rating', 'Top rated'],
  ['price_asc', 'Cheapest'],
  ['price_desc', 'Priciest'],
]

// What /api/saved returns — the wishlist row plus the catalog item it points at.
type SavedRow = {
  id: string
  item_type: string
  item_id: string
  kind: ItemKind
  item: CatalogItem | null
}

function ExplorePageInner() {
  const searchParams = useSearchParams()

  // Everything that defines "where you were" is seeded from the URL, so
  // coming back from a detail page restores the list instead of resetting it.
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab')
    return t === 'restaurants' || t === 'experiences' || t === 'saved' ? t : 'hotels'
  })
  const [destination, setDestination] = useState(() => {
    const d = searchParams.get('city')
    return d && DESTINATIONS.some((x) => x.name === d) ? d : DESTINATIONS[0].name
  })
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const [minRating, setMinRating] = useState<number | undefined>(
    () => Number(searchParams.get('minRating')) || undefined
  )
  const [maxPriceLevel, setMaxPriceLevel] = useState<number | undefined>(
    () => Number(searchParams.get('maxPriceLevel')) || undefined
  )
  const [sort, setSort] = useState<SortKey | undefined>(() => {
    const v = searchParams.get('sort')
    return v === 'rating' || v === 'price_asc' || v === 'price_desc' ? v : undefined
  })
  const [showFilters, setShowFilters] = useState(false)

  const [items, setItems] = useState<CatalogItem[]>([])
  const [saved, setSaved] = useState<SavedRow[]>([])
  const { savedIds, toggle } = useSaved()
  const [loading, setLoading] = useState(true)

  const isSavedTab = tab === 'saved'
  const searching = debouncedQuery.trim().length > 0
  const activeSlug = DESTINATIONS.find((d) => d.name === destination)?.slug
  const activeFilterCount = [minRating, maxPriceLevel, sort].filter((v) => v !== undefined).length

  // Debounce so we're not refetching on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        if (tab === 'saved') {
          const res = await fetch('/api/saved')
          const rows = res.ok ? await res.json() : []
          if (!cancelled) setSaved(rows)
        } else {
          const params = new URLSearchParams()
          // A search spans every city, so the destination chip only applies
          // when the search box is empty.
          if (searching) params.set('q', debouncedQuery.trim())
          else params.set('destination', destination)
          if (minRating !== undefined) params.set('minRating', String(minRating))
          if (maxPriceLevel !== undefined) params.set('maxPriceLevel', String(maxPriceLevel))
          if (sort) params.set('sort', sort)

          const res = await fetch(`/api/${tab}?${params}`)
          const data = res.ok ? await res.json() : []
          if (!cancelled) setItems(data)
        }
      } catch {
        if (cancelled) return
        if (tab === 'saved') setSaved([])
        else setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    // Guard against an earlier request's response landing after a newer one.
    return () => {
      cancelled = true
    }
  }, [tab, destination, debouncedQuery, searching, minRating, maxPriceLevel, sort])

  // history.replaceState rather than router.replace: this only needs to make
  // the URL restorable, not re-render or refetch anything.
  useEffect(() => {
    const params = new URLSearchParams()
    if (tab !== 'hotels') params.set('tab', tab)
    if (destination !== DESTINATIONS[0].name) params.set('city', destination)
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
    if (minRating !== undefined) params.set('minRating', String(minRating))
    if (maxPriceLevel !== undefined) params.set('maxPriceLevel', String(maxPriceLevel))
    if (sort) params.set('sort', sort)
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `/explore?${qs}` : '/explore')
  }, [tab, destination, debouncedQuery, minRating, maxPriceLevel, sort])

  // Runs once the fetched list is on screen — scrolling earlier would land
  // on an empty page and get clamped away.
  useEffect(() => {
    if (!loading) restoreItemPosition('explore')
  }, [loading, items, saved])

  function clearFilters() {
    setMinRating(undefined)
    setMaxPriceLevel(undefined)
    setSort(undefined)
  }

  const chipClass = (active: boolean) =>
    `shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active ? 'bg-lime-400 text-slate-900' : 'bg-slate-900 border border-slate-800 text-slate-300'
    }`

  return (
    <main className="pb-24">
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold mb-4">Explore</h1>

        <div className="flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 mb-3">
          <span className="text-slate-500 text-sm">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hotels, restaurants, experiences…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-500 min-w-0"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="text-slate-500 text-sm shrink-0"
            >
              ✕
            </button>
          )}
        </div>

        {!isSavedTab && (
          <>
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="flex items-center gap-2 text-sm text-slate-300 mb-3"
            >
              <span>⚙️ Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-lime-400 text-slate-900 rounded-full px-2 py-0.5 text-xs font-semibold">
                  {activeFilterCount}
                </span>
              )}
              <span className="text-slate-500">{showFilters ? '▲' : '▼'}</span>
            </button>

            {showFilters && (
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 mb-4 space-y-3">
                <div>
                  <p className="text-[11px] text-slate-400 mb-2 uppercase tracking-wide">Rating</p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {RATING_OPTIONS.map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setMinRating(minRating === value ? undefined : value)}
                        className={chipClass(minRating === value)}
                      >
                        ⭐ {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Attractions carry no price at all, so a price filter on the
                    experiences tab would silently match everything. */}
                {tab !== 'experiences' && (
                  <div>
                    <p className="text-[11px] text-slate-400 mb-2 uppercase tracking-wide">
                      Price up to
                    </p>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {PRICE_OPTIONS.map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() =>
                            setMaxPriceLevel(maxPriceLevel === value ? undefined : value)
                          }
                          className={chipClass(maxPriceLevel === value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[11px] text-slate-400 mb-2 uppercase tracking-wide">Sort by</p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {SORT_OPTIONS.map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setSort(sort === value ? undefined : value)}
                        className={chipClass(sort === value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-sm text-slate-400 underline">
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* City chips are meaningless while searching (results span every city)
            and while viewing the wishlist. */}
        {!isSavedTab && !searching && (
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
            {DESTINATIONS.map((d) => (
              <button
                key={d.slug}
                onClick={() => setDestination(d.name)}
                className={chipClass(destination === d.name)}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === key ? 'bg-lime-400 text-slate-900' : 'bg-slate-900 border border-slate-800 text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6">
        {!isSavedTab && !searching && activeSlug && (
          <Link
            href={`/explore/destination/${activeSlug}`}
            className="flex items-center justify-between rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 mb-4 text-sm"
          >
            <span className="text-slate-300">
              Everything about <span className="font-semibold text-white">{destination}</span>
            </span>
            <span className="text-lime-400">→</span>
          </Link>
        )}

        {!isSavedTab && !loading && (
          <p className="text-xs text-slate-500 mb-3">
            {items.length} result{items.length === 1 ? '' : 's'}
            {searching ? ` for “${debouncedQuery.trim()}” across all cities` : ` in ${destination}`}
          </p>
        )}

        {loading && <p className="text-slate-400 text-sm">Loading…</p>}

        {/* Saved tab */}
        {isSavedTab && !loading && saved.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-6 text-center">
            <p className="text-3xl mb-2">💔</p>
            <p className="font-semibold mb-1">Your wanderlist is empty!</p>
            <p className="text-slate-400 text-sm">
              Tap the ♡ on anything that catches your eye — it&apos;ll wait for you here.
            </p>
          </div>
        )}

        {isSavedTab && !loading && saved.length > 0 && (
          <div className="space-y-4">
            {saved
              .filter((row) => row.item && savedIds.has(row.item_id))
              .map((row) => (
                <ItemCard
                  key={row.id}
                  kind={row.kind}
                  item={row.item as CatalogItem}
                  saved={savedIds.has(row.item_id)}
                  onToggleSave={(i) => toggle(row.kind, i)}
                  listKey="explore"
                />
              ))}
          </div>
        )}

        {/* Browse / search results */}
        {!isSavedTab && !loading && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-6 text-center">
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-semibold mb-1">Nothing matched</p>
            <p className="text-slate-400 text-sm">
              {activeFilterCount > 0
                ? 'Try loosening the filters a bit.'
                : 'Try a different search or another tab.'}
            </p>
          </div>
        )}

        {!isSavedTab && (
          <div className="space-y-4">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                kind={tab}
                item={item}
                saved={savedIds.has(item.id)}
                onToggleSave={(i) => toggle(tab as ItemKind, i)}
                listKey="explore"
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// useSearchParams needs a Suspense boundary or the production build fails.
export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExplorePageInner />
    </Suspense>
  )
}
