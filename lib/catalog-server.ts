import hotels from '@/data/hotels.json'
import restaurants from '@/data/restaurants.json'
import experiences from '@/data/experiences.json'
import { CatalogItem, SavedType } from './catalog'

// Server-only: imports the whole catalog, so never pull this into a client
// component. Saved items and trip items both store only (item_type, item_id),
// so both need to stitch the real record back on before responding.

export const CATALOG: Record<SavedType, CatalogItem[]> = {
  hotel: hotels as CatalogItem[],
  restaurant: restaurants as CatalogItem[],
  experience: experiences as CatalogItem[],
}

// Returns null when a stored id no longer exists in the catalog — e.g. after a
// Places re-sync renamed things. Callers skip those rather than crashing.
export function findCatalogItem(type: string, id: string): CatalogItem | null {
  return CATALOG[type as SavedType]?.find((i) => i.id === id) ?? null
}

// What one trip item costs for the whole party.
//
// Hotels are priced per room per night, so they are NOT multiplied by traveller
// count — one room sleeps the group. Restaurants and activities are per person
// and are. Getting this wrong understated every multi-traveller trip.
export function itemCostInr(type: string, item: CatalogItem, travelers = 1): number {
  const party = Math.max(travelers, 1)

  if (type === 'hotel') return (item.price_per_night_inr as number) ?? 0
  if (type === 'experience') return ((item.price_inr as number) ?? 0) * party
  if (type === 'restaurant' && typeof item.price_range === 'string') {
    // "₹450-900/person" → 450, the low end, so estimates stay conservative.
    const match = item.price_range.replace(/,/g, '').match(/(\d+)/)
    return match ? Number(match[1]) * party : 0
  }
  return 0
}

// Restaurants can't actually be reserved through Voyagent — there's no booking
// integration behind them — so they stay in the plan but never in the amount
// charged. Only stays and activities are bookable.
export function isBookable(type: string): boolean {
  return type === 'hotel' || type === 'experience'
}
