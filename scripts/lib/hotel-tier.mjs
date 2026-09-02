// Google returns no priceLevel and no priceRange for Indian hotels — verified
// against Taj, ITC, Hilton and Radisson properties, all of which come back with
// nothing. That left every hotel defaulted to the same bucket, which made both
// the price filter and the derived ₹/night useless.
//
// The one real signal we do have is the property's own name. In Indian
// hospitality the brand tracks tier closely, so we classify on that. This is a
// heuristic, not real rate data — it exists so prices are *differentiated and
// plausible*, not so they're accurate.

const BUDGET =
  /\b(home\s?stay|homestay|guest\s?house|guesthouse|lodge|hostel|dorm|backpack|nivas|bhawan|bhavan|dharamshala|camp|cottage stay|paying guest)\b/i

const LUXURY =
  /\b(taj|oberoi|itc|leela|ritz|four seasons|st\.?\s?regis|park hyatt|grand hyatt|jw marriott|aman|raffles|conrad|rambagh|umaid|bulgari|mandarin oriental|waldorf|burj al arab|atlantis|one&only|one and only|cheval blanc|soneva|velaa|six senses|banyan tree|capella|rosewood|edition)\b/i

const UPPER =
  /\b(marriott|hilton|radisson|hyatt|novotel|sheraton|westin|meridien|doubletree|vivanta|fern|lemon tree|holiday inn|courtyard|crowne plaza|mayfair|elgin|sterling|welcomhotel|clarks|jaypee|anantara|shangri-?la|kempinski|intercontinental|sofitel|jumeirah|movenpick|m[oö]venpick|rixos|alila|como|pullman|melia|centara|amari)\b/i

const UPPER_HINT = /\b(resort|spa|palace|villa|retreat|manor|heritage|haveli)\b/i

export function hotelTier(name) {
  // Budget wins outright — "Hilton Garden Home Stay" is a home stay.
  if (BUDGET.test(name)) return 1
  if (LUXURY.test(name)) return 4
  if (UPPER.test(name)) return 3
  if (UPPER_HINT.test(name)) return 3
  return 2
}

// Wider, non-overlapping bands so the four tiers are visibly different.
export const HOTEL_BANDS = {
  1: [900, 2200],
  2: [2200, 5000],
  3: [5000, 11000],
  4: [11000, 26000],
}

// Deterministic spread within a band, seeded by place id, so re-running never
// reshuffles prices the user has already seen.
export function hashUnit(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

export function pickInBand([lo, hi], seed, roundTo = 50) {
  return Math.round((lo + (hi - lo) * hashUnit(seed)) / roundTo) * roundTo
}
