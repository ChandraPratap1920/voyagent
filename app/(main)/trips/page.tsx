'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import destinations from '@/data/destinations.json'

const CITIES = destinations.map((d) => d.name)

// Date maths on the YYYY-MM-DD strings the date input speaks, done in UTC so a
// trip doesn't shift a day for anyone east or west of the server.
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  const ms = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((ms(to) - ms(from)) / 86_400_000)
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

// A date input only opens its calendar from the small icon in Chrome, so
// tapping the field itself appeared to do nothing. showPicker throws if it
// isn't treated as a user gesture, which is harmless here.
function openPicker(e: React.SyntheticEvent<HTMLInputElement>) {
  try {
    e.currentTarget.showPicker?.()
  } catch {
    /* the field still types normally */
  }
}

type TripSummary = {
  id: string
  title: string | null
  start_date: string | null
  travelers: number
  status: string
  day_count: number
  item_count: number
  destinations: string[]
  planned_pct: number
}

type Leg = { destination: string; nights: number }

function TripsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [trips, setTrips] = useState<TripSummary[]>([])
  const [loading, setLoading] = useState(true)

  // Destination pages link here with ?new=Goa to jump straight into
  // the form with that city pre-filled.
  const presetCity = searchParams.get('new')
  const [creating, setCreating] = useState(() => presetCity !== null)
  const [legs, setLegs] = useState<Leg[]>(() => [
    {
      destination: presetCity && CITIES.includes(presetCity) ? presetCity : CITIES[0],
      // ?nights= carries the duration through from the linking page.
      nights: Math.min(Math.max(Number(searchParams.get('nights')) || 3, 1), 30),
    },
  ])
  const [startDate, setStartDate] = useState(() => searchParams.get('start') ?? '')
  const [travelers, setTravelers] = useState(() => Number(searchParams.get('travelers')) || 2)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/trips')
        const data = res.ok ? await res.json() : []
        if (!cancelled) setTrips(data)
      } catch {
        if (!cancelled) setTrips([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const totalNights = legs.reduce((sum, l) => sum + l.nights, 0)

  // The return date isn't stored — it's start date plus the nights you've
  // planned. Editing it works the other way round and stretches or shortens
  // the final stop, which is the only unambiguous reading when a trip has
  // several cities.
  const today = new Date().toISOString().slice(0, 10)
  const returnDate = startDate ? addDays(startDate, totalNights) : ''

  function setReturnDate(next: string) {
    if (!startDate || !next) return
    const nights = daysBetween(startDate, next)
    if (nights < 1) return

    const delta = nights - totalNights
    setLegs((prev) =>
      prev.map((l, i) =>
        i === prev.length - 1 ? { ...l, nights: Math.min(30, Math.max(1, l.nights + delta)) } : l
      )
    )
  }

  function updateLeg(index: number, patch: Partial<Leg>) {
    setLegs((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  async function createTrip() {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs,
          start_date: startDate || null,
          travelers,
          budget_inr: Number(searchParams.get('budget')) || null,
        }),
      })
      if (!res.ok) throw new Error('could not create trip')
      const { id } = await res.json()
      router.push(`/trips/${id}`)
    } catch {
      setError('Could not create that trip — give it another go.')
      setSaving(false)
    }
  }

  if (creating) {
    return (
      <main className="pb-24">
        <div className="px-6 pt-8 pb-4 flex items-center gap-3">
          <button
            onClick={() => setCreating(false)}
            aria-label="Cancel"
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold">New trip</h1>
        </div>

        <div className="px-6 space-y-5">
          {/* Multi-city: each leg is a city plus how many nights you're there */}
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Where to?
            </h2>
            <div className="space-y-3">
              {legs.map((leg, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Stop {i + 1}</span>
                    {legs.length > 1 && (
                      <button
                        onClick={() => setLegs((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-xs text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <select
                    value={leg.destination}
                    onChange={(e) => updateLeg(i, { destination: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm outline-none"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Nights</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateLeg(i, { nights: Math.max(1, leg.nights - 1) })}
                        className="w-8 h-8 rounded-full bg-slate-800 text-lg leading-none"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-semibold">{leg.nights}</span>
                      <button
                        onClick={() => updateLeg(i, { nights: Math.min(30, leg.nights + 1) })}
                        className="w-8 h-8 rounded-full bg-slate-800 text-lg leading-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                setLegs((prev) => [
                  ...prev,
                  { destination: CITIES.find((c) => !prev.some((l) => l.destination === c)) ?? CITIES[0], nights: 2 },
                ])
              }
              className="mt-3 w-full rounded-2xl border border-dashed border-slate-700 py-3 text-sm text-slate-300"
            >
              + Add another city
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="trip-start" className="text-xs text-slate-400 block mb-1">
                Start date
              </label>
              <input
                id="trip-start"
                type="date"
                value={startDate}
                min={today}
                onFocus={openPicker}
                onClick={openPicker}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-lime-400"
              />
            </div>
            <div>
              <label htmlFor="trip-return" className="text-xs text-slate-400 block mb-1">
                Return date
              </label>
              <input
                id="trip-return"
                type="date"
                value={returnDate}
                min={startDate ? addDays(startDate, 1) : today}
                disabled={!startDate}
                onFocus={openPicker}
                onClick={openPicker}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-lime-400 disabled:opacity-50"
              />
            </div>
          </div>

          {!startDate && (
            <p className="text-xs text-slate-500 -mt-3">
              Pick a start date and the return date fills in from your nights.
            </p>
          )}

          <div>
            <label htmlFor="trip-travelers" className="text-xs text-slate-400 block mb-1">
              Travelers
            </label>
            <input
              id="trip-travelers"
              type="number"
              min={1}
              value={travelers}
              onChange={(e) => setTravelers(Math.max(1, Number(e.target.value) || 1))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-lime-400"
            />
          </div>

          <p className="text-sm text-slate-400">
            {legs.map((l) => `${l.destination} ${l.nights}N`).join(' → ')} ·{' '}
            <span className="text-white font-medium">{totalNights} days</span>
            {startDate && (
              <>
                {' · '}
                {prettyDate(startDate)} → {prettyDate(returnDate)}
              </>
            )}
          </p>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={createTrip}
            disabled={saving}
            className="w-full rounded-full bg-lime-400 text-slate-900 font-semibold py-3 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Start planning ✨'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="pb-24">
      <div className="px-6 pt-8 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your trips</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-full bg-lime-400 text-slate-900 font-semibold px-4 py-2 text-sm"
        >
          + New
        </button>
      </div>

      <div className="px-6">
        {loading && <p className="text-slate-400 text-sm">Loading…</p>}

        {!loading && trips.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-8 text-center">
            <p className="text-3xl mb-2">🗺️</p>
            <p className="font-semibold mb-1">No trips yet!</p>
            <p className="text-slate-400 text-sm mb-4">
              Start one and build it day by day from the places you&apos;ve saved.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="rounded-full bg-lime-400 text-slate-900 font-semibold px-5 py-2 text-sm"
            >
              Plan your first trip
            </button>
          </div>
        )}

        <div className="space-y-4">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="block rounded-2xl bg-slate-900 border border-slate-800 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{trip.title ?? 'Untitled trip'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {trip.destinations.join(' → ')} · {trip.day_count} days
                    {trip.start_date ? ` · from ${trip.start_date}` : ''}
                  </p>
                </div>
                {trip.status === 'booked' && (
                  <span className="shrink-0 text-xs bg-lime-400/20 text-lime-300 px-2 py-1 rounded-full font-medium">
                    Booked
                  </span>
                )}
              </div>

              {/* Progress is the nudge to come back and finish planning */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">{trip.planned_pct}% planned</span>
                  <span className="text-slate-500">
                    {trip.item_count} item{trip.item_count === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-lime-400 transition-all"
                    style={{ width: `${trip.planned_pct}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

// useSearchParams needs a Suspense boundary or the production build fails.
export default function TripsPage() {
  return (
    <Suspense fallback={null}>
      <TripsPageInner />
    </Suspense>
  )
}
