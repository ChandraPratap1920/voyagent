'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTrip } from '@/context/TripContext'

export default function ItineraryPage() {
  const { parsedTrip, selectedFlight, selectedHotel, bookingRef, budgetBreakdown } = useTrip()
  const router = useRouter()
  const [tip, setTip] = useState<string | null>(null)

  // Pure display screen — but if someone lands here without having
  // actually paid (e.g. a refresh, since TripContext is in-memory only),
  // there's nothing real to show, so send them back.
  useEffect(() => {
    if (!bookingRef || !parsedTrip?.destination) {
      router.replace('/home')
    }
  }, [bookingRef, parsedTrip, router])

  // One real personalization touch, proving the Voyager Profile actually
  // shaped the output — per the roadmap's feature 9.
  useEffect(() => {
    if (!parsedTrip?.destination) return
    fetch('/api/personalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: parsedTrip.destination }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setTip(data?.tip ?? null))
      .catch(() => setTip(null))
  }, [parsedTrip])

  if (!bookingRef || !parsedTrip?.destination) return null // redirecting

  const breakdown = budgetBreakdown()

  return (
    <main className="pb-24">
      <div className="px-6 pt-10 pb-4 text-center">
        <p className="text-4xl mb-2">🎉</p>
        <h1 className="text-2xl font-bold">You&apos;re all set!</h1>
        <p className="text-slate-400 text-sm mt-1">
          {parsedTrip.destination} · {parsedTrip.duration_days ?? '—'} days · {parsedTrip.travelers ?? 1} travelers
        </p>
      </div>

      <div className="px-6 mb-6">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-indigo-500/10 to-slate-900 px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Booking reference</p>
            <p className="font-mono font-semibold">{bookingRef.pnr}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Hotel ref</p>
            <p className="font-mono font-semibold">{bookingRef.hotelRef}</p>
          </div>
        </div>
      </div>

      {tip && (
        <div className="px-6 mb-6">
          <div className="rounded-2xl border border-lime-400/30 bg-lime-400/10 px-4 py-3">
            <p className="text-xs text-lime-300 font-semibold mb-1">🦜 Voyagent&apos;s tip for you</p>
            <p className="text-sm text-lime-100">{tip}</p>
          </div>
        </div>
      )}

      <div className="px-6 space-y-3 mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-1">What you booked</h2>
        {selectedFlight && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-xs text-slate-400">✈️ Flight</p>
            <p className="font-medium text-sm mt-0.5">
              {String(selectedFlight.airline)} {String(selectedFlight.flight_no)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {String(selectedFlight.from)} → {String(selectedFlight.to)} · {String(selectedFlight.departure)}
            </p>
          </div>
        )}
        {selectedHotel && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-xs text-slate-400">🏨 Hotel</p>
            <p className="font-medium text-sm mt-0.5">{selectedHotel.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{String(selectedHotel.location)}</p>
          </div>
        )}
      </div>

      <div className="px-6 mb-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center justify-between">
          <span className="text-slate-400 text-sm">Total paid</span>
          <span className="font-semibold text-lime-400">
            ₹{Math.round(breakdown.total).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className="px-6 space-y-3">
        <button
          onClick={() => router.push('/home')}
          className="w-full rounded-full bg-lime-400 text-slate-900 font-semibold py-3"
        >
          Back to Home
        </button>
        <button
          onClick={() => router.push('/trips')}
          className="w-full rounded-full border border-slate-800 text-slate-300 font-medium py-3"
        >
          Build a full itinerary 🗓️
        </button>
      </div>
    </main>
  )
}
