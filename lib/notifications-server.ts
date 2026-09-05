import { SupabaseClient } from '@supabase/supabase-js'

// Notifications are derived, not stored. Everything below is computed from
// trips, bookings and saved items that already exist, so there's no table to
// write to and nothing can go stale — which also means no "mark as read", by
// design: an item disappears when the thing it's about is dealt with.

export type Notification = {
  id: string
  icon: string
  title: string
  body: string
  href: string
  at: string // ISO, used only for ordering
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${dateStr}T00:00:00`)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export async function buildNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<Notification[]> {
  const [tripsRes, bookingsRes, savedRes] = await Promise.all([
    supabase
      .from('trips')
      .select('id, title, start_date, status, created_at')
      .eq('user_id', userId),
    supabase
      .from('bookings')
      .select('id, destination, pnr, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('saved_items').select('destination').eq('user_id', userId),
  ])

  const trips = tripsRes.data ?? []
  const bookings = bookingsRes.data ?? []
  const saved = savedRes.data ?? []

  const out: Notification[] = []

  // Day counts for the "still empty" nudge — two flat queries, not one per trip.
  const tripIds = trips.map((t) => t.id)
  let days: { trip_id: string; day_number: number; destination: string }[] = []
  let items: { trip_id: string; day_number: number }[] = []
  if (tripIds.length) {
    const [d, i] = await Promise.all([
      supabase.from('trip_days').select('trip_id, day_number, destination').in('trip_id', tripIds),
      supabase.from('trip_items').select('trip_id, day_number').in('trip_id', tripIds),
    ])
    days = d.data ?? []
    items = i.data ?? []
  }

  for (const trip of trips) {
    const name = trip.title ?? 'Your trip'

    if (trip.start_date) {
      const left = daysUntil(trip.start_date)
      if (left >= 0 && left <= 14) {
        out.push({
          id: `start-${trip.id}`,
          icon: '🗓️',
          title: left === 0 ? `${name} starts today` : `${name} starts in ${left} day${left === 1 ? '' : 's'}`,
          body: 'Check your plan before you go.',
          href: `/trips/${trip.id}`,
          at: trip.start_date,
        })
      }
    }

    if (trip.status !== 'booked') {
      const total = days.filter((d) => d.trip_id === trip.id).length
      const filled = new Set(
        items.filter((i) => i.trip_id === trip.id).map((i) => i.day_number)
      ).size
      const empty = total - filled
      if (total > 0 && empty > 0) {
        out.push({
          id: `empty-${trip.id}`,
          icon: '📍',
          title: `${empty} day${empty === 1 ? '' : 's'} still empty in ${name}`,
          body: 'Add a stay, somewhere to eat, or something to do.',
          href: `/trips/${trip.id}`,
          at: trip.created_at,
        })
      }
    }
  }

  for (const b of bookings) {
    out.push({
      id: `booking-${b.id}`,
      icon: '✅',
      title: `${b.destination ?? 'Your trip'} is booked`,
      body: `Confirmation ${b.pnr}. Tap for your references.`,
      href: `/bookings/${b.id}`,
      at: b.created_at,
    })
  }

  // Somewhere they've saved several places but never started a trip.
  const plannedCities = new Set(days.map((d) => d.destination))
  const savedByCity = new Map<string, number>()
  for (const s of saved) {
    if (s.destination) savedByCity.set(s.destination, (savedByCity.get(s.destination) ?? 0) + 1)
  }
  for (const [city, count] of savedByCity) {
    if (count >= 3 && !plannedCities.has(city)) {
      out.push({
        id: `saved-${city}`,
        icon: '❤️',
        title: `${count} saved places in ${city}`,
        body: 'You never turned these into a trip.',
        href: `/trips?new=${encodeURIComponent(city)}`,
        at: new Date(0).toISOString(),
      })
    }
  }

  return out.sort((a, b) => (a.at < b.at ? 1 : -1))
}
