import { NextRequest, NextResponse } from 'next/server'
import { getPersonalizedTip } from '@/lib/ai'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { destination } = await req.json()

  if (!destination) {
    return NextResponse.json({ error: 'destination is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('personality, budget_style, pace, diet')
    .eq('id', user.id)
    .single()

  try {
    const tip = await getPersonalizedTip(destination, profile ?? {})
    return NextResponse.json({ tip })
  } catch (err) {
    console.error('personalize error', err)
    return NextResponse.json({ error: 'Failed to generate tip' }, { status: 500 })
  }
}
