// Shared catalog vocabulary. Deliberately imports no JSON so client
// components can use these helpers without pulling the whole dataset into
// the browser bundle — the detail pages import their own dataset directly.

// Plural — matches the dataset filenames and the /api/<kind> routes.
export type ItemKind = 'hotels' | 'restaurants' | 'experiences'

// Singular — matches the /explore/<type>/[id] route segment and the
// saved_items.item_type column. Keeping the mapping in one place so the
// two spellings can't drift apart.
export type SavedType = 'hotel' | 'restaurant' | 'experience'

export const SAVED_TYPE: Record<ItemKind, SavedType> = {
  hotels: 'hotel',
  restaurants: 'restaurant',
  experiences: 'experience',
}

export const ITEM_KIND: Record<SavedType, ItemKind> = {
  hotel: 'hotels',
  restaurant: 'restaurants',
  experience: 'experiences',
}

export type CatalogItem = {
  id: string
  name: string
  location: string
  destination: string
  description?: string
  rating?: number
  images?: string[]
  image_credits?: string[]
  // Populated for entries sourced from Google Places (scripts/sync-places.mjs).
  // Curated entries leave these undefined, and every consumer renders them
  // conditionally, so the two sources can coexist in one list.
  source?: 'places' | 'curated'
  place_id?: string
  address?: string | null
  maps_url?: string | null
  review_count?: number | null
  price_level?: number
  // Type-specific fields (price_per_night_inr, price_range, cuisine, duration…)
  // stay loose so a richer source like Google Places can add fields later
  // without every consumer needing to change.
  [key: string]: unknown
}

export function detailHref(kind: ItemKind, id: string): string {
  return `/explore/${SAVED_TYPE[kind]}/${id}`
}

// Google review counts run into the tens of thousands, which would dominate a
// card, so compact them: 39783 → "39.8k".
export function compactCount(n: number): string {
  if (n < 1000) return String(n)
  if (n < 100000) return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}k`
  return `${Math.round(n / 1000)}k`
}

// Each dataset prices things differently — hotels per night, restaurants as a
// range, experiences as a flat price plus duration.
export function itemPriceLabel(kind: ItemKind, item: CatalogItem): string {
  if (kind === 'hotels') {
    const price = item.price_per_night_inr as number | undefined
    return price ? `₹${price.toLocaleString('en-IN')}/night` : ''
  }
  if (kind === 'restaurants') {
    return item.price_range ? String(item.price_range) : ''
  }
  const price = item.price_inr as number | undefined
  const parts = [
    price ? `₹${price.toLocaleString('en-IN')}` : '',
    item.duration ? String(item.duration) : '',
  ].filter(Boolean)
  return parts.join(' · ')
}
