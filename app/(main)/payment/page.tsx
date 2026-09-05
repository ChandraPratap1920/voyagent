'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTrip } from '@/context/TripContext'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

export default function PaymentPage() {
  const { parsedTrip, selectedFlight, selectedHotel, budgetBreakdown, setBookingRef } = useTrip()
  const router = useRouter()

  // A previous mount may have already added the script (TripContext keeps the
  // trip in memory, so /payment can be revisited without a reload).
  const [scriptReady, setScriptReady] = useState(
    () => typeof document !== 'undefined' && document.getElementById('razorpay-checkout-js') !== null
  )
  const [paying, setPaying] = useState(false)
  const [savingTrip, setSavingTrip] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If someone lands here without a full selection (e.g. a page refresh,
  // since TripContext is in-memory only), send them back to pick again.
  useEffect(() => {
    if (!parsedTrip?.destination || !selectedFlight || !selectedHotel) {
      router.replace('/results')
    }
  }, [parsedTrip, selectedFlight, selectedHotel, router])

  // Load Razorpay's checkout script once.
  useEffect(() => {
    if (document.getElementById('razorpay-checkout-js')) return
    const script = document.createElement('script')
    script.id = 'razorpay-checkout-js'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => setScriptReady(true)
    script.onerror = () => setError('Could not load the payment widget — check your connection and retry.')
    document.body.appendChild(script)
  }, [])

  if (!parsedTrip?.destination || !selectedFlight || !selectedHotel) return null // redirecting
  const trip = parsedTrip // narrowed non-null from the guard above

  const breakdown = budgetBreakdown()
  const totalInr = Math.round(breakdown.total)

  // The whole selection lives in TripContext, which is memory only — so the
  // only exits from this screen were "pay" or "lose it". Saving writes a real
  // trip with the chosen stay already on every night, which is also the answer
  // for someone who isn't ready to pay yet.
  async function saveToTrips() {
    if (savingTrip) return
    const destination = trip.destination
    const hotel = selectedHotel
    if (!destination || !hotel) return

    setSavingTrip(true)
    setError(null)

    const nights = Math.min(Math.max(trip.duration_days ?? 3, 1), 30)

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs: [{ destination, nights }],
          title: `${nights}-day ${destination} trip`,
          travelers: trip.travelers ?? 1,
          budget_inr: trip.budget_inr ?? null,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? 'Could not save this to Trips — please try again.')
        return
      }

      // Carry the chosen stay onto every night, so the saved trip opens with
      // something in it rather than a row of empty days.
      await Promise.all(
        Array.from({ length: nights }, (_, i) => i + 1).map((day) =>
          fetch(`/api/trips/${data.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ day_number: day, item_type: 'hotel', item_id: hotel.id }),
          })
        )
      )

      router.push(`/trips/${data.id}`)
    } catch {
      setError('Could not save this to Trips — please try again.')
    } finally {
      setSavingTrip(false)
    }
  }

  async function handlePay() {
    setError(null)
    setPaying(true)
    try {
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInr: totalInr }),
      })
      if (!orderRes.ok) throw new Error('Could not start payment')
      const order = await orderRes.json()

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Voyagent',
        description: `${trip.destination} · ${trip.duration_days ?? '—'} days`,
        theme: { color: '#a3e635' },
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                trip: { destination: trip.destination, total_cost: totalInr },
              }),
            })
            if (!verifyRes.ok) throw new Error('Payment could not be verified')
            const result = await verifyRes.json()
            setBookingRef({ pnr: result.pnr, hotelRef: result.hotelRef })
            router.push('/itinerary')
          } catch {
            setError('Payment succeeded but confirmation failed — please contact support with your payment ID.')
            setPaying(false)
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      })
      rzp.open()
    } catch {
      setError('Could not start payment — please try again.')
      setPaying(false)
    }
  }

  return (
    <main className="pb-24">
      <div className="px-6 pt-8 pb-4">
        <p className="text-slate-400 text-sm">Confirm & pay for</p>
        <h1 className="text-2xl font-bold">
          {trip.destination} · {trip.duration_days ?? '—'} days
        </h1>
      </div>

      <div className="px-6 space-y-3 mb-6">
        <SummaryRow
          label="Flight"
          value={`${selectedFlight.airline} ${selectedFlight.flight_no}`}
          price={`₹${selectedFlight.price_inr.toLocaleString('en-IN')}`}
        />
        <SummaryRow
          label="Hotel"
          value={`${selectedHotel.name} · ${trip.duration_days ?? 1} nights`}
          price={`₹${selectedHotel.price_per_night_inr.toLocaleString('en-IN')}/night`}
        />
      </div>

      <div className="px-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 space-y-2 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Flight + tax</span>
            <span>₹{Math.round(breakdown.flightCost + breakdown.flightTax).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Hotel + tax</span>
            <span>₹{Math.round(breakdown.hotelCost + breakdown.hotelTax).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between font-semibold pt-2 border-t border-slate-800">
            <span>Total</span>
            <span className="text-lime-400">₹{totalInr.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          onClick={handlePay}
          disabled={!scriptReady || paying}
          className="w-full rounded-full bg-lime-400 text-slate-900 font-semibold py-3 disabled:opacity-40"
        >
          {paying ? 'Processing…' : !scriptReady ? 'Loading payment…' : `Pay ₹${totalInr.toLocaleString('en-IN')}`}
        </button>
        <p className="text-center text-slate-500 text-xs mt-3">
          Test mode — no real money is charged.
        </p>

        <div className="mt-6 pt-5 border-t border-slate-800">
          <button
            onClick={saveToTrips}
            disabled={savingTrip || paying}
            className="w-full rounded-full border border-slate-700 text-slate-300 font-medium py-3 disabled:opacity-50"
          >
            {savingTrip ? 'Saving…' : 'Not ready? Save to Trips'}
          </button>
          <p className="text-center text-slate-500 text-xs mt-3 leading-relaxed">
            Keeps your dates and {selectedHotel.name} on every night, so you can decide later.
            Flight options stay under <span className="text-slate-400">Getting there</span> in the
            trip.
          </p>
        </div>
      </div>
    </main>
  )
}

function SummaryRow({ label, value, price }: { label: string; value: string; price: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <div className="flex items-center justify-between mt-0.5">
        <p className="font-medium text-sm">{value}</p>
        <p className="text-sm text-slate-300">{price}</p>
      </div>
    </div>
  )
}
