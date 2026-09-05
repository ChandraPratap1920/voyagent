import { matchCity } from '@/lib/destinations'
import type { ParsedTrip } from '@/lib/ai'

// A deterministic parser used only when the model call fails.
//
// On 5 September the Gemini free-tier quota ran out and every parse returned
// 429, so the chat — the centrepiece of the product — answered every message
// with "couldn't quite catch that". This is the floor under that: it is not as
// good as the model and isn't meant to be, but it turns a total outage into a
// slightly blunter answer.

const WEEK_WORDS: [RegExp, number][] = [
  [/\bfortnight\b/i, 14],
  [/\b(a|one)\s+week\b/i, 7],
  [/\btwo\s+weeks\b/i, 14],
  [/\blong\s+weekend\b/i, 3],
  [/\bweekend\b/i, 2],
]

function duration(text: string): number | null {
  const explicit = text.match(/(\d+)\s*(?:-|\s)?\s*(day|days|night|nights|nite|nites)\b/i)
  if (explicit) {
    const n = Number(explicit[1])
    if (n >= 1 && n <= 30) return n
  }
  for (const [re, days] of WEEK_WORDS) if (re.test(text)) return days
  return null
}

function budget(text: string): number | null {
  // Order matters: "2 lakh" must be read before a bare "2".
  const lakh = text.match(/(?:₹|rs\.?|inr)?\s*([\d.]+)\s*(?:lakh|lakhs|lac|lacs)\b/i)
  if (lakh) return Math.round(parseFloat(lakh[1]) * 100_000)

  const crore = text.match(/(?:₹|rs\.?|inr)?\s*([\d.]+)\s*(?:crore|cr)\b/i)
  if (crore) return Math.round(parseFloat(crore[1]) * 10_000_000)

  const thousand = text.match(/(?:₹|rs\.?|inr)?\s*([\d.,]+)\s*(?:k|thousand)\b/i)
  if (thousand) return Math.round(parseFloat(thousand[1].replace(/,/g, '')) * 1000)

  // A plain number only counts as money when it's marked as such — otherwise
  // "5 days for 2" would read as a ₹5 budget.
  const marked = text.match(/(?:₹|rs\.?|inr)\s*([\d,]+)/i)
  if (marked) return Number(marked[1].replace(/,/g, ''))

  const worded = text.match(/budget[^\d]{0,12}([\d,]+)/i)
  if (worded) {
    const n = Number(worded[1].replace(/,/g, ''))
    if (n >= 1000) return n
  }
  return null
}

function travelers(text: string): number | null {
  const family = text.match(/family\s+of\s+(\d+)/i)
  if (family) return Number(family[1])

  const counted = text.match(
    /(\d+)\s*(?:people|persons|person|adults|pax|travell?ers|of\s+us|friends)\b/i
  )
  if (counted) {
    const n = Number(counted[1])
    if (n >= 1 && n <= 30) return n
  }

  // "for 5 days" is a duration, not a party size — the unit must be excluded
  // or every trip with a length reads as that many travellers.
  const forN = text.match(/\bfor\s+(\d+)\b(?!\s*(?:days?|nights?|nites?|weeks?|months?|hours?|hrs?))/i)
  if (forN) {
    const n = Number(forN[1])
    if (n >= 1 && n <= 30) return n
  }

  if (/\b(solo|alone|by myself|just me)\b/i.test(text)) return 1
  // Deliberately no gendered assumption beyond "one other person".
  if (/\b(wife|husband|partner|spouse|girlfriend|boyfriend|couple|honeymoon)\b/i.test(text)) return 2

  return null
}

export function parseTripFallback(message: string): ParsedTrip {
  return {
    // matchCity already scans free text for a catalogue city and handles
    // country aliases, so "trip to Thailand" reaches Bangkok here too.
    destination: matchCity(message),
    duration_days: duration(message),
    budget_inr: budget(message),
    travelers: travelers(message),
  }
}
