import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { findCatalogItem, isBookable, itemCostInr } from '@/lib/catalog-server'
import { ITEM_KIND, SavedType } from '@/lib/catalog'

// GET    /api/trips/[id]  → the trip with its days, each hydrated with catalog data
// PATCH  /api/trips/[id]  → update title / start_date / travelers / budget / status
// DELETE /api/trips/[id]
//
// RLS already scopes every table to the owner, so a wrong id simply returns
// nothing rather than another user's trip.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const { data: trip } = await supabase
    .from('trips')
    .select('id, title, start_date, travelers, budget_inr, status, created_at')
    .eq('id', id)
    .single()

  if (!trip) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const [{ data: days }, { data: items }] = await Promise.all([
    supabase
      .from('trip_days')
      .select('day_number, destination')
      .eq('trip_id', id)
      .order('day_number'),
    supabase
      .from('trip_items')
      .select('id, day_number, item_type, item_id, sort_order')
      .eq('trip_id', id)
      .order('sort_order'),
  ])

  let estimatedTotal = 0
  // What we'd actually charge: stays + activities, never restaurants.
  let bookableTotal = 0

  const hydratedDays = (days ?? []).map((day) => {
    const dayItems = (items ?? [])
      .filter((i) => i.day_number === day.day_number)
      .map((row) => {
        const item = findCatalogItem(row.item_type, row.item_id)
        if (item) {
          const cost = itemCostInr(row.item_type, item, trip.travelers)
          estimatedTotal += cost
          if (isBookable(row.item_type)) bookableTotal += cost
        }
        return {
          id: row.id,
          item_type: row.item_type,
          item_id: row.item_id,
          kind: ITEM_KIND[row.item_type as SavedType],
          item, // null if the catalog entry has since disappeared
        }
      })

    return {
      day_number: day.day_number,
      destination: day.destination,
      items: dayItems,
      // Drives the per-day completeness meter in the planner.
      has: {
        hotel: dayItems.some((i) => i.item_type === 'hotel'),
        restaurant: dayItems.some((i) => i.item_type === 'restaurant'),
        experience: dayItems.some((i) => i.item_type === 'experience'),
      },
    }
  })

  const plannedDays = hydratedDays.filter((d) => d.items.length > 0).length

  return NextResponse.json({
    ...trip,
    days: hydratedDays,
    destinations: [...new Set(hydratedDays.map((d) => d.destination))],
    planned_pct: hydratedDays.length
      ? Math.round((plannedDays / hydratedDays.length) * 100)
      : 0,
    estimated_total_inr: estimatedTotal,
    bookable_total_inr: bookableTotal,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.title === 'string') patch.title = body.title.trim()
  if (body.start_date !== undefined) patch.start_date = body.start_date || null
  if (body.travelers !== undefined) patch.travelers = Math.max(Number(body.travelers) || 1, 1)
  if (body.budget_inr !== undefined) patch.budget_inr = body.budget_inr
  if (body.status === 'planning' || body.status === 'booked') patch.status = body.status

  const { error } = await supabase.from('trips').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  // trip_days / trip_items cascade on the FK.
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
