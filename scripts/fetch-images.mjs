// One-time (re-runnable) data-prep script — NOT part of the running app.
// Populates images[]/image_credits[] in data/*.json by querying the live
// Unsplash Search API, so every hotel/restaurant/experience/destination
// gets a distinct, accurately-matched photo instead of a hand-picked one.
//
// Usage: node scripts/fetch-images.mjs
// Requires UNSPLASH_ACCESS_KEY in .env.local (free key from unsplash.com/developers).

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local')
  let raw
  try {
    raw = readFileSync(envPath, 'utf-8')
  } catch {
    console.error('.env.local not found — copy .env.local.example and fill in UNSPLASH_ACCESS_KEY.')
    process.exit(1)
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvLocal()

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
if (!ACCESS_KEY) {
  console.error('UNSPLASH_ACCESS_KEY is missing from .env.local — get a free key at unsplash.com/developers.')
  process.exit(1)
}

async function searchPhotos(query, count) {
  const params = new URLSearchParams({ query, per_page: String(count), orientation: 'landscape' })
  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  })
  if (!res.ok) {
    throw new Error(`Unsplash search failed (${res.status}) for query "${query}": ${await res.text()}`)
  }
  const data = await res.json()
  return data.results.map((r) => ({
    url: r.urls.regular,
    credit: `Photo by ${r.user.name} on Unsplash`,
  }))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Each target: file path, how many images per entry, and a list of queries to try
// in order (specific → generic) until one returns results. Fictional/curated
// property names (e.g. "Taj Holiday Village") return 0 Unsplash results on their
// own, so every category falls back to a generic descriptor + destination.
const TARGETS = [
  {
    file: 'data/hotels.json',
    count: 4,
    queries: (h) => [`${h.name} ${h.location}`, `hotel resort ${h.destination}`, `hotel india`],
  },
  {
    file: 'data/restaurants.json',
    count: 4,
    queries: (r) => [
      `${r.cuisine} restaurant ${r.location}`,
      `${r.cuisine.split(',')[0]} food ${r.destination}`,
      `restaurant food india`,
    ],
  },
  {
    file: 'data/experiences.json',
    count: 3,
    // Curated activities carry a hand-written photo_query: "White Water
    // Rafting (16 km)" is a poor image search on its own, "white water rafting
    // rapids river" is a good one.
    queries: (e) =>
      e.photo_query
        ? [e.photo_query, `${e.destination} travel adventure`]
        : [`${e.name} ${e.destination}`, e.name, `${e.destination} travel adventure`],
  },
  {
    file: 'data/destinations.json',
    count: 5,
    // Lead with the tagline ("Munnar Tea Hills") — a bare "<city> India travel"
    // pulls whatever is generically popular for the region, which is how Munnar
    // ended up showing an Alleppey houseboat.
    queries: (d) => [
      `${d.name} ${d.tagline.split('·')[0].trim()}`,
      `${d.name} India travel`,
      `India travel landmark`,
    ],
  },
]

// Photo ids already committed to some entry, so no two entries can share one.
const usedPhotoIds = new Set()

function photoId(url) {
  return url.match(/photo-[0-9a-zA-Z_-]+/)?.[0] ?? url
}

async function searchWithFallback(queries, count) {
  let best = { query: queries[queries.length - 1], photos: [] }

  for (const query of queries) {
    // Over-fetch so there are spares left after dropping duplicates.
    const photos = await searchPhotos(query, count * 3)
    const fresh = photos.filter((p) => !usedPhotoIds.has(photoId(p.url)))

    if (fresh.length >= count) return { query, photos: fresh.slice(0, count) }
    // Keep the best partial result in case no query fully satisfies us.
    if (fresh.length > best.photos.length) best = { query, photos: fresh }

    await sleep(250)
  }

  return best
}

// By default only fill entries that have no images yet, so re-running the
// script to cover newly-added cities can't churn images that were already
// reviewed and approved. Pass --force to refetch everything.
const FORCE = process.argv.includes('--force')
// Limit to one dataset with e.g. --only=destinations
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1]

async function run() {
  // Reserve every photo already committed anywhere in the catalog BEFORE we
  // start. Without this, --only=experiences can hand an activity the same photo
  // a city hero is already using, because the destinations file was skipped.
  for (const target of TARGETS) {
    const entries = JSON.parse(readFileSync(path.join(root, target.file), 'utf-8'))
    for (const entry of entries) {
      for (const url of entry.images ?? []) usedPhotoIds.add(photoId(url))
    }
  }

  for (const target of TARGETS) {
    if (ONLY && !target.file.includes(ONLY)) continue

    const filePath = path.join(root, target.file)
    const entries = JSON.parse(readFileSync(filePath, 'utf-8'))

    const todo = entries.filter((e) => FORCE || !e.images?.length)

    // Free up the photos held by the entries we're about to refetch, so they
    // can legitimately be reassigned; everything else stays reserved.
    for (const entry of todo) {
      for (const url of entry.images ?? []) usedPhotoIds.delete(photoId(url))
    }

    console.log(
      `\n=== ${target.file} — ${todo.length} of ${entries.length} to fetch${FORCE ? ' (forced)' : ''} ===`
    )
    if (todo.length === 0) continue

    for (const entry of todo) {
      try {
        const { query, photos } = await searchWithFallback(target.queries(entry), target.count)
        entry.images = photos.map((p) => p.url)
        entry.image_credits = photos.map((p) => p.credit)
        for (const p of photos) usedPhotoIds.add(photoId(p.url))
        console.log(`✓ ${entry.name ?? entry.slug} — "${query}" → ${photos.length} photos`)
        console.log(`    ${entry.images[0] ?? '(no results)'}`)
      } catch (err) {
        console.error(`✗ ${entry.name ?? entry.slug} failed: ${err.message}`)
      }
      await sleep(250) // stay well under the 50 req/hour free-tier limit
    }

    writeFileSync(filePath, JSON.stringify(entries, null, 2) + '\n')
  }

  console.log('\nDone. Spot-check the logged URLs above against each entry\'s name/location before shipping.')
}

run()
