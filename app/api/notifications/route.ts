import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { buildNotifications } from '@/lib/notifications-server'

// GET /api/notifications → derived alerts for the bell on Home.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const items = await buildNotifications(supabase, user.id)
  return NextResponse.json({ count: items.length, items })
}
