'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

// Booking for a built itinerary. Reuses the same create-order / verify routes
// as the older chat→results→payment flow; the only addition is passing trip_id
// so verify can flip the trip to "booked".
//
// Only stays and activities are charged. Restaurants stay in the plan but are
// never billed — we have no reservation integration behind them, so charging
// for dinner would be pretending.
export default function TripBooking({
  tripId,
  title,
  destinations,
  bookableTotalInr,
  planOnlyInr,
  status,
  onBooked,
}: {
  tripId: string
  title: string
  destinations: string[]
  bookableTotalInr: number
  planOnlyInr: number
  status: string
  onBooked: () => void
}) {
  const [scriptReady, setScriptReady] = useState(
    () => typeof document !== 'undefined' && document.getElementById('razorpay-checkout-js') !== null
  )
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (document.getElementById('razorpay-checkout-js')) return
    const script = document.createElement('script')
    script.id = 'razorpay-checkout-js'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => setScriptReady(true)
    script.onerror = () => setError('Could not load the payment widget — check your connection.')
    document.body.appendChild(script)
  }, [])

  if (status === 'booked') {
    return (
      <div className="rounded-2xl border border-lime-400/30 bg-lime-400/10 px-4 py-4 text-center">
        <p className="text-2xl mb-1">🎟️</p>
        <p className="font-semibold text-lime-200">This trip is booked!</p>
        <p className="text-xs text-lime-300/80 mt-1">
          Your confirmation is in My Bookings on Home.
        </p>
      </div>
    )
  }

  const nothingToBook = bookableTotalInr <= 0

  async function handlePay() {
    setError(null)
    setPaying(true)
    try {
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInr: bookableTotalInr }),
      })
      if (!orderRes.ok) throw new Error('Could not start payment')
      const order = await orderRes.json()

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Voyagent',
        description: title,
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
                trip_id: tripId,
                trip: {
                  destination: destinations.join(' → '),
                  total_cost: bookableTotalInr,
                },
              }),
            })
            if (!verifyRes.ok) throw new Error('Payment could not be verified')
            onBooked()
          } catch {
            setError(
              'Payment succeeded but confirmation failed — please contact support with your payment ID.'
            )
          } finally {
            setPaying(false)
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      })
      rzp.open()
    } catch {
      setError('Could not start payment — please try again.')
      setPaying(false)
    }
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Stays &amp; activities</span>
        <span className="font-semibold">₹{bookableTotalInr.toLocaleString('en-IN')}</span>
      </div>

      {planOnlyInr > 0 && (
        <div className="flex items-center justify-between text-xs mt-1.5">
          <span className="text-slate-500">Food (planned, not booked)</span>
          <span className="text-slate-500">~₹{planOnlyInr.toLocaleString('en-IN')}</span>
        </div>
      )}

      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
        You&apos;re paying for stays and activities. Restaurants stay on your plan — pay those at
        the table.
      </p>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      <button
        onClick={handlePay}
        disabled={!scriptReady || paying || nothingToBook}
        className="w-full mt-3 rounded-full bg-lime-400 text-slate-900 font-semibold py-3 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {nothingToBook
          ? 'Add a stay or activity to book'
          : paying
            ? 'Processing…'
            : `Book this trip · ₹${bookableTotalInr.toLocaleString('en-IN')}`}
      </button>
    </div>
  )
}
