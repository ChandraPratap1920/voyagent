import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Support tickets. Same auth-guard shape as /api/saved: every handler resolves
// the user first and 401s before touching the database, so RLS is a backstop
// rather than the only thing standing between users' tickets.

const CATEGORIES = ['booking', 'planning', 'account', 'bug', 'other'] as const
type Category = (typeof CATEGORIES)[number]

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

// Free-text going into Postgres needs a ceiling — without one a single request
// can push an unbounded blob into the table.
const MAX_SUBJECT = 120
const MAX_MESSAGE = 2000

// GET /api/support → this user's tickets, newest first
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, category, subject, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST /api/support  body: { category, subject, message }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)

  if (!body || !isCategory(body.category)) {
    return NextResponse.json({ error: 'A valid category is required' }, { status: 400 })
  }

  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }
  if (subject.length > MAX_SUBJECT || message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: 'Subject or message is too long' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({ user_id: user.id, category: body.category, subject, message })
    .select('id, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id, created_at: data.created_at })
}
