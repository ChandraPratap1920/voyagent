import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { findCatalogItem } from '@/lib/catalog-server'
import { ITEM_KIND, SavedType } from '@/lib/catalog'

// The catalog lives in the repo while the wishlist lives in Postgres, so GET
// stitches them together here — one round trip instead of making the client
// fetch all three datasets just to render a name and a thumbnail.

// The user's wishlist. Save/unsave is a toggle, so DELETE matches on
// (item_type, item_id) rather than a row id — the client only ever knows
// which catalog item it's looking at, not the saved_items primary key.

const ITEM_TYPES = ['hotel', 'restaurant', 'experience'] as const
type ItemType = (typeof ITEM_TYPES)[number]

function isItemType(value: string | null): value is ItemType {
  return !!value && (ITEM_TYPES as readonly string[]).includes(value)
}

// GET /api/saved  → everything this user has saved, newest first
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('saved_items')
    .select('id, item_type, item_id, destination, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const hydrated = (data ?? []).map((row) => {
    const item = findCatalogItem(row.item_type, row.item_id)
    return {
      ...row,
      kind: ITEM_KIND[row.item_type as SavedType],
      // null when a saved id no longer exists in the catalog (e.g. an entry was
      // renamed or removed) — the client skips those rather than crashing.
      item: item ?? null,
    }
  })

  return NextResponse.json(hydrated)
}

// POST /api/saved  body: { item_type, item_id, destination }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || !isItemType(body.item_type) || typeof body.item_id !== 'string') {
    return NextResponse.json({ error: 'item_type and item_id are required' }, { status: 400 })
  }

  // Upsert so double-tapping Save is a no-op instead of a duplicate-key error.
  const { error } = await supabase.from('saved_items').upsert(
    {
      user_id: user.id,
      item_type: body.item_type,
      item_id: body.item_id,
      destination: typeof body.destination === 'string' ? body.destination : null,
    },
    { onConflict: 'user_id,item_type,item_id' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, saved: true })
}

// DELETE /api/saved?item_type=hotel&item_id=taj-holiday-village
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const itemType = searchParams.get('item_type')
  const itemId = searchParams.get('item_id')

  if (!isItemType(itemType) || !itemId) {
    return NextResponse.json({ error: 'item_type and item_id are required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('user_id', user.id)
    .eq('item_type', itemType)
    .eq('item_id', itemId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, saved: false })
}
