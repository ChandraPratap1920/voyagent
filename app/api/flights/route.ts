import { NextRequest, NextResponse } from 'next/server'
import flights from '@/data/flights.json'

// GET /api/flights?to=Goa&maxPrice=6000
// Filters the curated static dataset — this "looks live" to the user
// but is not calling any real travel API, per MVP scope.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const to = searchParams.get('to')?.toLowerCase()
  const maxPrice = searchParams.get('maxPrice')
    ? Number(searchParams.get('maxPrice'))
    : undefined

  let results = flights

  if (to) {
    results = results.filter((f) => f.to.toLowerCase() === to)
  }
  if (maxPrice) {
    results = results.filter((f) => f.price_inr <= maxPrice)
  }

  return NextResponse.json(results)
}
