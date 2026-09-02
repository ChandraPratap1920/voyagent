'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import destinations from '@/data/destinations.json'
import ItemImage from '@/components/ItemImage'
import { CatalogItem, ItemKind, detailHref } from '@/lib/catalog'

// One saved place, already stitched to its catalog record by /api/saved.
type SavedRow = {
  id: string
  item_id: string
  kind: ItemKind
  item: CatalogItem | null
}

type Booking = {
  id: string
  destination: string
  pnr: string
  trip_cost_inr: number | null
  created_at: string
}

export default function HomePage() {
  const [name, setName] = useState('Traveler')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [search, setSearch] = useState('')
  const [saved, setSaved] = useState<SavedRow[]>([])
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const fullName = (user.user_metadata?.full_name as string) || 'Traveler'
        setName(fullName.split(' ')[0])

        const { data } = await supabase
          .from('bookings')
          .select('id, destination, pnr, trip_cost_inr, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        setBookings(data ?? [])
      }
      setLoadingBookings(false)
    }
    load()

    // Saved places are the reason to come back, so Home surfaces them.
    fetch('/api/saved')
      .then((res) => (res.ok ? res.json() : []))
      .then(setSaved)
      .catch(() => setSaved([]))
  }, [])

  // Trending cards now open the destination page instead of deep-linking into
  // chat, so this is only the plain "start a conversation with Vito" path.
  function planTrip() {
    router.push('/chat')
  }

  return (
    <main className="pb-24">
      <div className="px-6 pt-8 pb-2 flex items-center justify-between">
        <Link href="/account" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center text-slate-900 font-bold text-lg">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-slate-400 leading-tight">Good to see you,</p>
            <p className="font-bold leading-tight">{name}! 👋</p>
          </div>
        </Link>
        <span className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sm">
          🔔
        </span>
      </div>

      <div className="px-6 pt-4">
        <h1 className="text-2xl font-bold leading-tight">
          Explore What Feels Right.
          <br />
          <span className="text-lime-400">AI Will Guide You</span>
        </h1>
      </div>

      {/* Hands off to Explore rather than implementing search twice. */}
      <div className="px-6 pt-5">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3">
          <span className="text-slate-500 text-sm">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) {
                router.push(`/explore?q=${encodeURIComponent(search.trim())}`)
              }
            }}
            placeholder="Search stays, food, things to do…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-500 min-w-0"
          />
          {search.trim() && (
            <button
              onClick={() => router.push(`/explore?q=${encodeURIComponent(search.trim())}`)}
              className="text-lime-400 text-sm font-medium shrink-0"
            >
              Go
            </button>
          )}
        </div>
      </div>

      {/* My Bookings — playful gamified empty state per product decision */}
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">🎫 My Bookings</h2>
          {bookings.length > 0 && <span className="text-lime-400 text-sm">View all</span>}
        </div>

        {!loadingBookings && bookings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-6 text-center">
            <p className="text-3xl mb-2">🧳</p>
            <p className="font-semibold mb-1">Your passport page is blank!</p>
            <p className="text-slate-400 text-sm mb-4">
              Zero trips booked, zero stamps earned. Let&apos;s fix that streak.
            </p>
            <button
              onClick={() => planTrip()}
              className="rounded-full bg-lime-400 text-slate-900 font-semibold px-5 py-2 text-sm"
            >
              Plan your first trip ✨
            </button>
          </div>
        )}

        {bookings.length > 0 && (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-4">
                <p className="font-semibold">{b.destination}</p>
                <p className="text-xs text-slate-400 mt-1">
                  PNR {b.pnr}
                  {b.trip_cost_inr ? ` · ₹${b.trip_cost_inr.toLocaleString('en-IN')}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved places — hidden entirely when empty so new users don't meet a
          bare shelf. Sits above Trending because returning users come for this. */}
      {saved.filter((s) => s.item).length > 0 && (
        <div className="px-6 pt-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">❤️ Your Wanderlist</h2>
            <Link href="/explore?tab=saved" className="text-lime-400 text-sm">
              See all
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {saved
              .filter((row) => row.item)
              .slice(0, 12)
              .map((row) => (
                <Link
                  key={row.id}
                  href={detailHref(row.kind, row.item_id)}
                  className="shrink-0 w-36 rounded-2xl overflow-hidden border border-slate-800 text-left"
                >
                  <div className="relative h-24 bg-slate-800">
                    <ItemImage
                      images={row.item!.images}
                      alt={row.item!.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />
                    <span className="absolute top-2 right-2 text-rose-400 text-base">♥</span>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold truncate">{row.item!.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{row.item!.destination}</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Trending destinations */}
      <div className="px-6 pt-7">
        <h2 className="font-bold mb-3">✨ Trending Destinations</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {destinations.map((t) => (
            <Link
              key={t.slug}
              href={`/explore/destination/${t.slug}`}
              className="shrink-0 w-40 rounded-2xl overflow-hidden border border-slate-800 text-left"
            >
              <div className="relative h-28 bg-slate-800">
                {t.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.images[0]} alt={t.name} className="w-full h-full object-cover" loading="lazy" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-3">
                  <p className="font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-[11px] text-slate-300">{t.tagline}</p>
                </div>
              </div>
              <div className="px-3 py-2 text-xs text-slate-400">
                From ₹{t.from_price_inr.toLocaleString('en-IN')}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
