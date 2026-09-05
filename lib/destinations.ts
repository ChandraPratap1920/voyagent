import destinations from '@/data/destinations.json'

// Vito's parser is deliberately unconstrained — lib/ai.ts asks for a
// destination string and takes whatever the model says, which is the right
// call for a parser but means it will happily return "Paris". Matching that
// against the catalogue is done here, *after* the parse, so the AI itself
// stays exactly as it is.

export const CITY_NAMES: string[] = destinations.map((d) => d.name)

// Substring matching on very short inputs is meaningless ("a" matches
// everything), so only whole-word-ish inputs get the fuzzy pass.
const MIN_FUZZY_LENGTH = 3

// People ask for countries and regions, not our city names — "5 days in
// Thailand" should reach Bangkok rather than being told we don't cover it.
// Kochi is here because the Kerala entry is catalogued as Alleppey.
const ALIASES: Record<string, string> = {
  thailand: 'Bangkok',
  'sri lanka': 'Colombo',
  srilanka: 'Colombo',
  indonesia: 'Bali',
  uae: 'Dubai',
  'united arab emirates': 'Dubai',
  kerala: 'Alleppey',
  kochi: 'Alleppey',
  cochin: 'Alleppey',
  ernakulam: 'Alleppey',
  backwaters: 'Alleppey',
  rajasthan: 'Jaipur',
  himachal: 'Manali',
  'himachal pradesh': 'Manali',
  kullu: 'Manali',
  taj: 'Agra',
  'taj mahal': 'Agra',
}

/**
 * Resolves free text to a catalogue city name, or null if we don't cover it.
 * Handles the shapes Vito actually returns: "goa", "Goa, India", "North Goa".
 */
export function matchCity(input: string | null | undefined): string | null {
  if (!input) return null
  const needle = input.trim().toLowerCase()
  if (!needle) return null

  // Exact name or slug first, so "Goa" never resolves to something else.
  for (const d of destinations) {
    if (d.name.toLowerCase() === needle || d.slug.toLowerCase() === needle) return d.name
  }

  if (ALIASES[needle]) return ALIASES[needle]

  if (needle.length < MIN_FUZZY_LENGTH) return null

  for (const d of destinations) {
    const name = d.name.toLowerCase()
    if (needle.includes(name) || name.includes(needle)) return d.name
  }

  // "Bali, Indonesia" and "trip to Thailand" reach the aliases too.
  for (const [alias, city] of Object.entries(ALIASES)) {
    if (needle.includes(alias)) return city
  }

  return null
}
