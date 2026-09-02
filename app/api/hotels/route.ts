import { NextRequest, NextResponse } from 'next/server'
import hotels from '@/data/hotels.json'
import { CatalogItem } from '@/lib/catalog'
import { applyFilters, parseFilterParams } from '@/lib/filters'

// GET /api/hotels?destination=Goa&q=beach&minRating=4&maxPriceLevel=3&maxPrice=9000&sort=rating
// Passing q searches across every city and ignores destination.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const params = parseFilterParams(searchParams)
  return NextResponse.json(applyFilters(hotels as CatalogItem[], 'hotels', params))
}
