import { CatalogItem, ItemKind } from './catalog'

// Shared search/filter/sort for the catalog. Lives in one place so the three
// /api routes and any future consumer can't drift apart on what "4★ and up"
// or "cheapest first" means.

export type SortKey = 'rating' | 'price_asc' | 'price_desc'

export type FilterParams = {
  q?: string
  destination?: string
  minRating?: number
  maxPriceLevel?: number
  maxPrice?: number // hotels only — a real ₹/night cap
  sort?: SortKey
}

// Hotels are the only category with a meaningful rupee figure to sort on;
// for the rest, Google's 1-4 bucket is the closest thing to a price.
function priceOf(kind: ItemKind, item: CatalogItem): number {
  if (kind === 'hotels' && typeof item.price_per_night_inr === 'number') {
    return item.price_per_night_inr
  }
  if (kind === 'experiences' && typeof item.price_inr === 'number') {
    return item.price_inr
  }
  return (item.price_level ?? 2) * 1000
}

function matchesQuery(item: CatalogItem, q: string): boolean {
  const haystack = [item.name, item.location, item.destination, item.address ?? '']
    .join(' ')
    .toLowerCase()
  // Every word must appear somewhere, so "goa beach" narrows rather than widens.
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}

export function applyFilters(
  items: CatalogItem[],
  kind: ItemKind,
  params: FilterParams
): CatalogItem[] {
  let results = items

  // A text search deliberately ignores the destination chip and spans every
  // city — searching "houseboat" should find it wherever it is.
  if (params.q?.trim()) {
    results = results.filter((i) => matchesQuery(i, params.q!.trim()))
  } else if (params.destination) {
    const dest = params.destination.toLowerCase()
    results = results.filter((i) => i.destination.toLowerCase() === dest)
  }

  if (params.minRating !== undefined) {
    results = results.filter((i) => (i.rating ?? 0) >= params.minRating!)
  }

  if (params.maxPriceLevel !== undefined) {
    results = results.filter((i) => (i.price_level ?? 2) <= params.maxPriceLevel!)
  }

  if (params.maxPrice !== undefined) {
    results = results.filter((i) => priceOf(kind, i) <= params.maxPrice!)
  }

  if (params.sort) {
    // Copy first — never reorder the imported dataset in place.
    results = [...results].sort((a, b) => {
      if (params.sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
      const diff = priceOf(kind, a) - priceOf(kind, b)
      return params.sort === 'price_asc' ? diff : -diff
    })
  } else if (kind === 'experiences') {
    // With no explicit sort, bookable activities lead. Otherwise the curated
    // entries sit below fifteen Places attractions and nobody scrolls far
    // enough to discover that Rishikesh does rafting.
    results = [...results].sort(
      (a, b) => Number(a.source === 'places') - Number(b.source === 'places')
    )
  }

  return results
}

// Parses the query string once so every route reads params identically.
export function parseFilterParams(searchParams: URLSearchParams): FilterParams {
  const num = (key: string) => {
    const raw = searchParams.get(key)
    if (raw === null || raw === '') return undefined
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const sort = searchParams.get('sort')

  return {
    q: searchParams.get('q') ?? undefined,
    destination: searchParams.get('destination') ?? undefined,
    minRating: num('minRating'),
    maxPriceLevel: num('maxPriceLevel'),
    maxPrice: num('maxPrice'),
    sort: sort === 'rating' || sort === 'price_asc' || sort === 'price_desc' ? sort : undefined,
  }
}
