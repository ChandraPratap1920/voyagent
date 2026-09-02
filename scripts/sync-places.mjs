// Pulls real venues from the Google Places API (New) into data/*.json.
//
// This is a data-prep script, not part of the running app: pages keep reading
// local JSON so they stay statically prerendered and instant, and the API key
// never leaves the server. Re-run it to refresh ratings and photos.
//
// Usage:
//   node scripts/sync-places.mjs --city=Goa        # one city (cheap test run)
//   node scripts/sync-places.mjs                   # every city
//   node scripts/sync-places.mjs --limit=15 --photos=3
//   node scripts/sync-places.mjs --dry             # count API calls, write nothing
//
// Requires GOOGLE_PLACES_API_KEY in .env.local.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { HOTEL_BANDS, hotelTier, pickInBand } from './lib/hotel-tier.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function loadEnvLocal() {
  const raw = readFileSync(path.join(root, '.env.local'), 'utf-8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    if (!(key in process.env)) process.env[key] = trimmed.slice(eq + 1).trim()
  }
}
loadEnvLocal()

const KEY = process.env.GOOGLE_PLACES_API_KEY
if (!KEY) {
  console.error('GOOGLE_PLACES_API_KEY missing from .env.local')
  process.exit(1)
}

const arg = (name, fallback) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback

const ONLY_CITY = arg('city', null)
const LIMIT = Number(arg('limit', 15)) // places per category per city
const PHOTOS = Number(arg('photos', 3)) // photos per place
const DRY = process.argv.includes('--dry')

// Counters so we can report exactly what this run cost.
const calls = { search: 0, photo: 0 }

// Only these fields are requested — every extra field can push the request into
// a pricier SKU tier, so the mask is kept to what the UI actually renders.
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.googleMapsUri',
  'places.photos',
  'places.editorialSummary',
  'places.servesVegetarianFood',
].join(',')

async function textSearch(query, limit, regionCode = 'IN') {
  calls.search++
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, pageSize: Math.min(limit, 20), regionCode }),
  })
  const data = await res.json()
  if (data.error) throw new Error(`${data.error.status}: ${data.error.message}`)
  return data.places ?? []
}

// Resolve a photo resource name to a durable lh3.googleusercontent.com URL.
// skipHttpRedirect returns JSON containing the URL instead of redirecting to the
// bytes, and crucially that URL carries no API key — so it's safe to store and
// render in the browser.
async function resolvePhoto(name) {
  calls.photo++
  const res = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxWidthPx=1080&skipHttpRedirect=true&key=${KEY}`
  )
  const data = await res.json()
  return data.photoUri ?? null
}

const PRICE_LEVELS = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

// Google gives restaurants a 1-4 price bucket (and hotels nothing at all), never
// a rupee figure, so the app's budget and GST maths still needs a number. We
// derive one and spread it deterministically within the band using the place id
// — same input always yields the same price, so re-syncing doesn't shuffle
// prices the user has already seen. HOTEL_BANDS/hotelTier come from
// ./lib/hotel-tier.mjs, which explains why hotels need their own classifier.
const FOOD_BANDS = { 1: [200, 450], 2: [450, 900], 3: [900, 1800], 4: [1800, 3500] }

// The bands above are calibrated for India. destinations.json carries a
// price_multiplier per city so expensive markets land in a believable range —
// without it a Maldives water villa prices like a Goa guesthouse.

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function describe(place, city, kind) {
  const editorial = place.editorialSummary?.text
  if (editorial) return editorial

  // Fallback when Google has no editorial blurb — say something true rather
  // than inventing detail we don't have.
  const noun = kind === 'hotels' ? 'stay' : kind === 'restaurants' ? 'spot' : 'place'
  if (place.rating && place.userRatingCount) {
    return `A ${noun} in ${city} rated ${place.rating} by ${place.userRatingCount.toLocaleString('en-IN')} visitors on Google.`
  }
  return `A ${noun} in ${city}.`
}

async function buildItem(place, city, kind, priceMultiplier = 1) {
  const level = PRICE_LEVELS[place.priceLevel] ?? 2
  const seed = place.id

  const photoNames = (place.photos ?? []).slice(0, PHOTOS).map((p) => p.name)
  const images = []
  const credits = []

  for (const [i, name] of photoNames.entries()) {
    const uri = DRY ? null : await resolvePhoto(name)
    if (DRY) calls.photo++
    if (!uri) continue
    images.push(uri)
    const author = place.photos[i]?.authorAttributions?.[0]?.displayName
    credits.push(author ? `Photo by ${author} via Google` : 'Photo via Google')
  }

  const item = {
    id: `${slugify(place.displayName.text)}-${place.id.slice(-4).toLowerCase()}`,
    place_id: place.id,
    name: place.displayName.text,
    description: describe(place, city, kind),
    location: place.shortFormattedAddress ?? place.formattedAddress ?? city,
    address: place.formattedAddress ?? null,
    destination: city,
    rating: place.rating ?? null,
    review_count: place.userRatingCount ?? null,
    price_level: level,
    maps_url: place.googleMapsUri ?? null,
    source: 'places',
    images,
    image_credits: credits,
  }

  if (kind === 'hotels') {
    // Google has no price signal for hotels, so tier comes from the brand.
    const tier = hotelTier(place.displayName.text)
    item.price_level = tier
    item.price_per_night_inr =
      Math.round((pickInBand(HOTEL_BANDS[tier], seed) * priceMultiplier) / 50) * 50
    item.veg_friendly = place.servesVegetarianFood ?? null
    item.tag = null
  }
  if (kind === 'restaurants') {
    const [lo, hi] = FOOD_BANDS[level]
    const low = Math.round((pickInBand([lo, (lo + hi) / 2], seed) * priceMultiplier) / 50) * 50
    item.price_range = `₹${low.toLocaleString('en-IN')}-${(low * 2).toLocaleString('en-IN')}/person`
    item.cuisine = place.editorialSummary?.text ? null : 'Local favourite'
    item.veg_friendly = place.servesVegetarianFood ?? null
  }

  return item
}

const CATEGORIES = [
  { kind: 'hotels', file: 'data/hotels.json', query: (c, country) => `hotels in ${c} ${country}` },
  {
    kind: 'restaurants',
    file: 'data/restaurants.json',
    query: (c, country) => `best restaurants in ${c} ${country}`,
  },
  {
    kind: 'experiences',
    file: 'data/experiences.json',
    query: (c, country) => `top tourist attractions in ${c} ${country}`,
  },
]

async function run() {
  const destinations = JSON.parse(readFileSync(path.join(root, 'data/destinations.json'), 'utf-8'))
  // Keep the whole record — the country and region code steer the search, so
  // "hotels in Bali Indonesia" doesn't come back full of Indian results.
  const cities = destinations.filter(
    (d) => !ONLY_CITY || d.name.toLowerCase() === ONLY_CITY.toLowerCase()
  )

  if (cities.length === 0) {
    console.error(`No city matching "${ONLY_CITY}" in destinations.json`)
    process.exit(1)
  }

  console.log(
    `Syncing ${cities.map((c) => c.name).join(', ')} · ${LIMIT} places/category · ${PHOTOS} photos each${DRY ? ' · DRY RUN' : ''}\n`
  )

  for (const cat of CATEGORIES) {
    const filePath = path.join(root, cat.file)
    const existing = JSON.parse(readFileSync(filePath, 'utf-8'))

    // Curated experiences are kept alongside Places attractions; everything
    // previously synced for a city we're re-syncing gets replaced.
    const keep = existing.filter((e) => {
      const isCuratedExperience = cat.kind === 'experiences' && e.source !== 'places'
      const isOtherCity = !cities.some((c) => c.name === e.destination)
      return isCuratedExperience || isOtherCity
    })

    const added = []
    for (const city of cities) {
      try {
        const places = await textSearch(
          cat.query(city.name, city.country ?? 'India'),
          LIMIT,
          city.region_code ?? 'IN'
        )
        for (const place of places.slice(0, LIMIT)) {
          added.push(await buildItem(place, city.name, cat.kind, city.price_multiplier ?? 1))
        }
        console.log(`  ${cat.kind.padEnd(12)} ${city.name.padEnd(13)} → ${places.length} places`)
      } catch (err) {
        console.error(`  ${cat.kind.padEnd(12)} ${city.name.padEnd(13)} ✗ ${err.message}`)
      }
    }

    if (!DRY) {
      writeFileSync(filePath, JSON.stringify([...keep, ...added], null, 2) + '\n')
    }
    console.log(
      `  → ${cat.file}: ${keep.length} kept + ${added.length} synced${DRY ? ' (not written)' : ''}\n`
    )
  }

  console.log(`API calls this run — text search: ${calls.search}, photos: ${calls.photo}`)
}

run()
