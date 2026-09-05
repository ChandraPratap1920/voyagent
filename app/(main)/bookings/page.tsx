import Link from 'next/link'
import { redirect } from 'next/navigation'
import BackButton from '@/components/BackButton'
import { createClient } from '@/lib/supabase-server'

// Every booking this traveller has made. Home shows the two most recent; this
// is where "View all" goes.

export const metadata = { title: 'My Bookings · Voyagent' }

function inr(n: number | null): string {
  return n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function BookingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, destination, pnr, trip_cost_inr, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const rows = bookings ?? []

  return (
    <main className="pb-24">
      <div className="px-6 pt-8 pb-4 flex items-center gap-3">
        <BackButton
          fallbackHref="/home"
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"
        />
        <h1 className="text-xl font-bold">My Bookings</h1>
      </div>

      {rows.length === 0 ? (
        <div className="px-6">
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-8 text-center">
            <p className="text-3xl mb-2">🧳</p>
            <p className="font-semibold mb-1">Nothing booked yet</p>
            <p className="text-slate-400 text-sm mb-4">
              Once you book a trip, your confirmations live here.
            </p>
            <Link
              href="/chat"
              className="inline-block rounded-full bg-lime-400 text-slate-900 font-semibold px-5 py-2 text-sm"
            >
              Plan a trip ✨
            </Link>
          </div>
        </div>
      ) : (
        <div className="px-6 space-y-3">
          {rows.map((b) => (
            <Link
              key={b.id}
              href={`/bookings/${b.id}`}
              className="block rounded-2xl bg-slate-900 border border-slate-800 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{b.destination ?? 'Trip'}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    PNR {b.pnr} · booked {when(b.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-lime-400">{inr(b.trip_cost_inr)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mt-0.5">
                    {b.status ?? 'confirmed'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
