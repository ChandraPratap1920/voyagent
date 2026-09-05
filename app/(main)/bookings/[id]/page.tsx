import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import BackButton from '@/components/BackButton'
import { createClient } from '@/lib/supabase-server'

// A single booking. Previously the card on Home was a dead <div> — you could
// see that you'd booked something and nothing else.

function inr(n: number | null): string {
  return n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function BookingDetailPage({
  params,
}: {
  // params is a Promise in this version of Next — it must be awaited.
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, destination, pnr, hotel_ref, payment_id, trip_cost_inr, status, created_at, trip_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!booking) notFound()

  // If this booking came from the itinerary builder, offer the plan itself.
  let trip: { id: string; title: string | null; start_date: string | null } | null = null
  if (booking.trip_id) {
    const { data } = await supabase
      .from('trips')
      .select('id, title, start_date')
      .eq('id', booking.trip_id)
      .eq('user_id', user.id)
      .single()
    trip = data
  }

  return (
    <main className="pb-24">
      <div className="px-6 pt-8 pb-4 flex items-center gap-3">
        <BackButton
          fallbackHref="/bookings"
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"
        />
        <h1 className="text-xl font-bold">Booking</h1>
      </div>

      <div className="px-6">
        <div className="rounded-2xl border border-lime-900 bg-lime-950/30 px-5 py-5 mb-5">
          <p className="text-xs uppercase tracking-wide text-lime-400 mb-1">
            {booking.status ?? 'confirmed'}
          </p>
          <p className="text-2xl font-bold">{booking.destination ?? 'Your trip'}</p>
          <p className="text-slate-400 text-sm mt-1">Booked {when(booking.created_at)}</p>
        </div>

        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Reference
        </h2>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800 mb-5">
          <Row label="Flight PNR" value={booking.pnr} mono />
          <Row label="Hotel reference" value={booking.hotel_ref} mono />
          <Row label="Payment ID" value={booking.payment_id} mono />
          <Row label="Total paid" value={inr(booking.trip_cost_inr)} highlight />
        </div>

        {trip ? (
          <Link
            href={`/trips/${trip.id}`}
            className="block w-full text-center rounded-full bg-lime-400 text-slate-900 font-semibold py-3 mb-3"
          >
            View the day-by-day plan
          </Link>
        ) : (
          <p className="text-xs text-slate-500 leading-relaxed mb-4">
            This was booked as a straight flight and stay, so there&apos;s no day-by-day plan
            attached. You can still build one from Trips.
          </p>
        )}

        <Link
          href="/support"
          className="block w-full text-center rounded-full border border-slate-700 text-slate-300 font-medium py-3"
        >
          Need help with this booking?
        </Link>

        <p className="text-center text-slate-500 text-xs mt-4">
          Test mode — no real money was charged.
        </p>
      </div>
    </main>
  )
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: string | null
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span
        className={`text-right truncate ${mono ? 'font-mono text-xs' : ''} ${
          highlight ? 'text-lime-400 font-semibold' : 'font-medium'
        }`}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}
