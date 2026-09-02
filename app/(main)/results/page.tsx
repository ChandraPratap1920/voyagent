'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTrip, Flight, Hotel } from '@/context/TripContext'

export default function ResultsPage() {
  const { parsedTrip, selectedFlight, selectedHotel, setSelectedFlight, setSelectedHotel, budgetBreakdown } =
    useTrip()
  const router = useRouter()

  const [flights, setFlights] = useState<Flight[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // If someone lands here without going through chat first (e.g. a page
  // refresh, since TripContext is in-memory only), send them back rather
  // than showing an empty/broken screen.
  useEffect(() => {
    if (!parsedTrip?.destination) {
      router.replace('/chat')
    }
  }, [parsedTrip, router])

  useEffect(() => {
    if (!parsedTrip?.destination) return

    async function loadOptions() {
      setLoading(true)
      setError(null)
      try {
        const [flightsRes, hotelsRes] = await Promise.all([
          fetch(`/api/flights?to=${encodeURIComponent(parsedTrip!.destination!)}`),
          fetch(`/api/hotels?destination=${encodeURIComponent(parsedTrip!.destination!)}`),
        ])
        if (!flightsRes.ok || !hotelsRes.ok) throw new Error('Failed to load options')

        const [flightData, hotelData]: [Flight[], Hotel[]] = await Promise.all([
          flightsRes.json(),
          hotelsRes.json(),
        ])
        setFlights(flightData)
        setHotels(hotelData)
      } catch {
        setError('Could not load flights and hotels — please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [parsedTrip])

  if (!parsedTrip?.destination) return null // redirecting

  const breakdown = budgetBreakdown()
  const budget = parsedTrip.budget_inr ?? 0
  const overBudget = budget > 0 && breakdown.total > budget
  const canContinue = !!selectedFlight && !!selectedHotel

  return (
    <main className="flex flex-col max-w-md mx-auto w-full pb-48">
      <div className="px-6 pt-8 pb-4">
        <p className="text-slate-400 text-sm">Options for</p>
        <h1 className="text-2xl font-bold">
          {parsedTrip.destination} · {parsedTrip.duration_days ?? '—'} days
        </h1>
      </div>

      {loading && <p className="px-6 text-slate-400 text-sm">Loading curated options…</p>}
      {error && <p className="px-6 text-red-400 text-sm">{error}</p>}

      {!loading && !error && flights.length === 0 && hotels.length === 0 && (
        <p className="px-6 text-slate-400 text-sm">
          No curated options for {parsedTrip.destination} yet — try Goa, Manali, Alleppey, or Jaipur.
        </p>
      )}

      {flights.length > 0 && (
        <section className="px-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Flights ({flights.length} option{flights.length > 1 ? 's' : ''})
          </h2>
          <div className="space-y-3">
            {flights.map((f) => {
              const isSelected = selectedFlight?.id === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFlight(isSelected ? null : f)}
                  className={`w-full text-left rounded-2xl border px-4 py-4 transition-all ${
                    isSelected
                      ? 'bg-indigo-500/15 border-indigo-400 ring-1 ring-indigo-400/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg shrink-0">
                      ✈️
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">
                          {f.airline} {f.flight_no}
                        </p>
                        {f.tag ? (
                          <span className="text-xs bg-lime-400/20 text-lime-300 px-2 py-0.5 rounded-full font-medium">
                            {String(f.tag)}
                          </span>
                        ) : null}
                        {isSelected && <span className="text-indigo-300 text-xs ml-auto">✓ Selected</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {String(f.from)} → {String(f.to)} · {String(f.departure)} · {String(f.duration_mins)}m
                      </p>
                      {f.arrival_airport ? (
                        <p className="text-xs text-slate-500 mt-0.5">Arrives {String(f.arrival_airport)}</p>
                      ) : null}
                      <p className="text-xs text-slate-500 mt-1 italic">{String(f.note)}</p>
                      <p className="font-semibold mt-2">₹{f.price_inr.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {hotels.length > 0 && (
        <section className="px-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Hotels ({hotels.length} option{hotels.length > 1 ? 's' : ''})
          </h2>
          <div className="space-y-4">
            {hotels.map((h) => {
              const isSelected = selectedHotel?.id === h.id
              return (
                <button
                  key={h.id}
                  onClick={() => setSelectedHotel(isSelected ? null : h)}
                  className={`w-full text-left rounded-2xl border overflow-hidden transition-all ${
                    isSelected
                      ? 'border-indigo-400 ring-1 ring-indigo-400/50'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="relative h-36 bg-slate-800">
                    {(h.images as string[] | undefined)?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={(h.images as string[])[0]}
                        alt={h.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    {h.tag ? (
                      <span className="absolute top-3 left-3 text-xs bg-lime-400 text-slate-900 px-2 py-1 rounded-full font-semibold">
                        {String(h.tag)}
                      </span>
                    ) : null}
                    {isSelected && (
                      <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm">
                        ✓
                      </span>
                    )}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div>
                        <p className="font-semibold text-white leading-tight">{h.name}</p>
                        <p className="text-xs text-slate-300">
                          {String(h.location)} · ⭐ {String(h.rating)}
                        </p>
                      </div>
                      <p className="font-semibold text-white shrink-0">
                        ₹{h.price_per_night_inr.toLocaleString('en-IN')}
                        <span className="text-xs font-normal text-slate-300">/night</span>
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Live budget breakdown — pure arithmetic, no API call, per roadmap feature 6 */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-slate-900 border-t border-slate-800 px-6 py-4 z-30">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-400">Flight + tax</span>
          <span>₹{Math.round(breakdown.flightCost + breakdown.flightTax).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-400">Hotel + tax</span>
          <span>₹{Math.round(breakdown.hotelCost + breakdown.hotelTax).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex items-center justify-between font-semibold mb-3 pt-2 border-t border-slate-800">
          <span>Total</span>
          <span className={overBudget ? 'text-amber-400' : 'text-lime-400'}>
            ₹{Math.round(breakdown.total).toLocaleString('en-IN')}
            {budget > 0 && <span className="text-slate-500 font-normal"> / ₹{budget.toLocaleString('en-IN')}</span>}
          </span>
        </div>
        {overBudget && (
          <p className="text-amber-400 text-xs mb-3">
            This is over your stated budget — consider a lighter hotel option.
          </p>
        )}
        <button
          disabled={!canContinue}
          onClick={() => router.push('/payment')}
          className="w-full rounded-full bg-lime-400 text-slate-900 font-semibold py-3 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {canContinue ? 'Continue to payment' : 'Pick a flight and hotel to continue'}
        </button>
      </div>
    </main>
  )
}
