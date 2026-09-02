import { NextRequest, NextResponse } from 'next/server'
import experiences from '@/data/experiences.json'
import { CatalogItem } from '@/lib/catalog'
import { applyFilters, parseFilterParams } from '@/lib/filters'

// GET /api/experiences?destination=Manali&q=rafting&minRating=4.5&sort=rating
// Passing q searches across every city and ignores destination.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const params = parseFilterParams(searchParams)
  return NextResponse.json(applyFilters(experiences as CatalogItem[], 'experiences', params))
}
