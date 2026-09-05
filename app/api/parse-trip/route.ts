import { NextRequest, NextResponse } from 'next/server'
import { parseTripMessage } from '@/lib/ai'
import { parseTripFallback } from '@/lib/parse-fallback'

export async function POST(req: NextRequest) {
  const { message } = await req.json()

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  try {
    const parsed = await parseTripMessage(message)
    return NextResponse.json(parsed)
  } catch (err) {
    // Logged server-side (visible in your `npm run dev` terminal) so a bad
    // API key or model name shows up clearly instead of a silent failure.
    console.error('parse-trip error:', err instanceof Error ? err.message : err)

    // Rather than fail outright, fall back to the deterministic parser. It's
    // blunter than the model, but a quota or an outage then costs some
    // nuance instead of the whole feature.
    const fallback = parseTripFallback(message)
    const gotSomething = Object.values(fallback).some((v) => v !== null)

    if (gotSomething) {
      return NextResponse.json({ ...fallback, degraded: true })
    }

    return NextResponse.json({ error: 'Failed to parse trip' }, { status: 500 })
  }
}
