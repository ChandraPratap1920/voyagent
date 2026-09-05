import { NextRequest, NextResponse } from 'next/server'
import flights from '@/data/flights.json'
import transport from '@/data/transport.json'
import { matchCity } from '@/lib/destinations'

// GET /api/transport?to=Goa
//
// Everything needed for the "Getting there" card in one call. Like
// /api/flights this filters a curated static dataset rather than calling a
// live inventory API — the UI says so plainly rather than implying otherwise.

type Transport = typeof transport
type CityKey = keyof Transport

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const city = matchCity(searchParams.get('to'))

  if (!city) {
    return NextResponse.json({ error: 'a known destination is required' }, { status: 400 })
  }

  const local = transport[city as CityKey]

  return NextResponse.json({
    destination: city,
    flights: flights.filter((f) => f.to === city),
    trains: local?.trains ?? [],
    buses: local?.buses ?? [],
    transfer: local?.transfer ?? null,
  })
}
