import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET  /api/trips  → the user's trips, newest first, with a planned-% summary
// POST /api/trips  → create a trip from city legs
//
// Multi-city is expressed as legs ([{destination, nights}]), which we expand
// into one trip_days row per day. A "leg" is just consecutive days sharing a
// city, so nothing else in the app needs to know about legs at all.

type Leg = { destination: string; nights: number }

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, title, start_date, travelers, budget_inr, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!trips?.length) return NextResponse.json([])

  const ids = trips.map((t) => t.id)

  // Two flat queries rather than a per-trip round trip.
  const [{ data: days }, { data: items }] = await Promise.all([
    supabase.from('trip_days').select('trip_id, day_number, destination').in('trip_id', ids),
    supabase.from('trip_items').select('trip_id, day_number').in('trip_id', ids),
  ])

  const summarised = trips.map((trip) => {
    const tripDays = (days ?? []).filter((d) => d.trip_id === trip.id)
    const tripItems = (items ?? []).filter((i) => i.trip_id === trip.id)
    const daysWithSomething = new Set(tripItems.map((i) => i.day_number)).size

    return {
      ...trip,
      day_count: tripDays.length,
      item_count: tripItems.length,
      // Cities in day order, de-duplicated, so the card can read "Munnar → Alleppey".
      destinations: [...new Set(
        tripDays.sort((a, b) => a.day_number - b.day_number).map((d) => d.destination)
      )],
      planned_pct: tripDays.length
        ? Math.round((daysWithSomething / tripDays.length) * 100)
        : 0,
    }
  })

  return NextResponse.json(summarised)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const legs: Leg[] = Array.isArray(body?.legs) ? body.legs : []

  const cleanLegs = legs
    .filter((l) => typeof l?.destination === 'string' && l.destination.trim())
    .map((l) => ({
      destination: l.destination.trim(),
      nights: Math.min(Math.max(Number(l.nights) || 1, 1), 30),
    }))

  if (cleanLegs.length === 0) {
    return NextResponse.json({ error: 'at least one leg is required' }, { status: 400 })
  }

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim()
      : `${cleanLegs.map((l) => l.destination).join(' → ')} trip`

  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      user_id: user.id,
      title,
      start_date: body.start_date || null,
      travelers: Math.max(Number(body.travelers) || 1, 1),
      budget_inr: body.budget_inr ?? null,
    })
    .select('id')
    .single()

  if (error || !trip) {
    return NextResponse.json({ error: error?.message ?? 'could not create trip' }, { status: 500 })
  }

  // Expand legs into consecutive numbered days.
  const dayRows: { trip_id: string; day_number: number; destination: string }[] = []
  let dayNumber = 1
  for (const leg of cleanLegs) {
    for (let n = 0; n < leg.nights; n++) {
      dayRows.push({ trip_id: trip.id, day_number: dayNumber++, destination: leg.destination })
    }
  }

  const { error: daysError } = await supabase.from('trip_days').insert(dayRows)
  if (daysError) {
    // Don't leave a trip with no days behind.
    await supabase.from('trips').delete().eq('id', trip.id)
    return NextResponse.json({ error: daysError.message }, { status: 500 })
  }

  return NextResponse.json({ id: trip.id, day_count: dayRows.length }, { status: 201 })
}
