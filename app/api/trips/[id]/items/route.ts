import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// POST   /api/trips/[id]/items  body: { day_number, item_type, item_id }
// DELETE /api/trips/[id]/items?row_id=<trip_items.id>
//
// Deleting takes the trip_items row id (not item_id) because the same place can
// legitimately appear on more than one day of a trip.

const ITEM_TYPES = ['hotel', 'restaurant', 'experience']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const dayNumber = Number(body?.day_number)

  if (!body || !ITEM_TYPES.includes(body.item_type) || typeof body.item_id !== 'string') {
    return NextResponse.json({ error: 'item_type and item_id are required' }, { status: 400 })
  }
  if (!Number.isInteger(dayNumber) || dayNumber < 1) {
    return NextResponse.json({ error: 'day_number must be a positive integer' }, { status: 400 })
  }

  // Confirm the day belongs to this trip — otherwise an item could be pinned to
  // a day that doesn't exist.
  const { data: day } = await supabase
    .from('trip_days')
    .select('day_number')
    .eq('trip_id', id)
    .eq('day_number', dayNumber)
    .single()

  if (!day) return NextResponse.json({ error: 'no such day on this trip' }, { status: 400 })

  const { error } = await supabase.from('trip_items').upsert(
    {
      trip_id: id,
      day_number: dayNumber,
      item_type: body.item_type,
      item_id: body.item_id,
      sort_order: Number(body.sort_order) || 0,
    },
    // Adding the same place to the same day twice is a no-op, not an error.
    { onConflict: 'trip_id,day_number,item_type,item_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const rowId = new URL(req.url).searchParams.get('row_id')
  if (!rowId) return NextResponse.json({ error: 'row_id is required' }, { status: 400 })

  const { error } = await supabase
    .from('trip_items')
    .delete()
    .eq('id', rowId)
    .eq('trip_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
