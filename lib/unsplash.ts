// Server-side only — never import this into a 'use client' file, the
// Access Key would leak to the browser (same pattern as lib/ai.ts).

export type UnsplashPhoto = {
  url: string
  credit: string // "Photo by <name> on Unsplash", per Unsplash's attribution requirement
}

// Searches Unsplash for a query and returns up to `count` photos, best match first.
export async function searchUnsplashPhotos(query: string, count = 3): Promise<UnsplashPhoto[]> {
  const params = new URLSearchParams({
    query,
    per_page: String(count),
    orientation: 'landscape',
  })

  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
  })

  if (!res.ok) {
    throw new Error(`Unsplash search failed (${res.status}) for query "${query}"`)
  }

  const data = await res.json()
  type Result = { urls: { regular: string }; user: { name: string } }

  return (data.results as Result[]).map((r) => ({
    url: r.urls.regular,
    credit: `Photo by ${r.user.name} on Unsplash`,
  }))
}
