import { NextRequest, NextResponse } from 'next/server'
import restaurants from '@/data/restaurants.json'
import { CatalogItem } from '@/lib/catalog'
import { applyFilters, parseFilterParams } from '@/lib/filters'

// GET /api/restaurants?destination=Jaipur&q=thali&minRating=4.2&sort=rating
// Passing q searches across every city and ignores destination.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const params = parseFilterParams(searchParams)
  return NextResponse.json(applyFilters(restaurants as CatalogItem[], 'restaurants', params))
}
