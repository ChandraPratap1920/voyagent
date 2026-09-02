import Link from 'next/link'
import destinations from '@/data/destinations.json'
import SaveButton from '@/components/SaveButton'
import BackButton from '@/components/BackButton'
import { CatalogItem, ItemKind, SAVED_TYPE, itemPriceLabel } from '@/lib/catalog'

// Facts differ per catalog type. Anything absent is simply skipped, so a
// richer data source (e.g. Google Places adding an address or opening hours)
// can extend this without breaking the layout.
function factsFor(kind: ItemKind, item: CatalogItem): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = []

  if (kind === 'hotels') {
    if (item.price_per_night_inr) {
      facts.push({
        label: 'Per night',
        value: `₹${(item.price_per_night_inr as number).toLocaleString('en-IN')}`,
      })
    }
    if (item.veg_friendly !== undefined) {
      facts.push({ label: 'Veg-friendly', value: item.veg_friendly ? 'Yes' : 'Limited' })
    }
  }

  if (kind === 'restaurants') {
    if (item.cuisine) facts.push({ label: 'Cuisine', value: String(item.cuisine) })
    if (item.price_range) facts.push({ label: 'Typical spend', value: String(item.price_range) })
  }

  if (kind === 'experiences') {
    if (item.price_inr) {
      facts.push({ label: 'Price', value: `₹${(item.price_inr as number).toLocaleString('en-IN')}` })
    }
    if (item.duration) facts.push({ label: 'Duration', value: String(item.duration) })
  }

  // Places attractions carry no price or duration, which would leave the grid
  // empty — fall back to the social proof Google does give us.
  if (facts.length === 0 && typeof item.review_count === 'number') {
    facts.push({ label: 'Google reviews', value: item.review_count.toLocaleString('en-IN') })
    if (item.rating) facts.push({ label: 'Rating', value: `${item.rating} / 5` })
  }

  return facts
}

export default function ItemDetail({ kind, item }: { kind: ItemKind; item: CatalogItem }) {
  const images = item.images ?? []
  const credits = item.image_credits ?? []
  const facts = factsFor(kind, item)
  const savedType = SAVED_TYPE[kind]

  // Send "back" to the item's own city page when we can resolve it.
  const citySlug = destinations.find((d) => d.name === item.destination)?.slug
  const backHref = citySlug ? `/explore/destination/${citySlug}` : '/explore'

  return (
    <main className="pb-24">
      {/* Swipeable gallery — CSS scroll-snap, no JS needed */}
      <div className="relative">
        <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory h-64 bg-slate-800">
          {images.length > 0 ? (
            images.map((src, i) => (
              <div key={src} className="relative shrink-0 w-full h-full snap-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${item.name} — photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading={i === 0 ? undefined : 'lazy'}
                />
              </div>
            ))
          ) : (
            <div className="w-full h-full" />
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/80 to-transparent" />

        <BackButton
          fallbackHref={backHref}
          className="absolute top-6 left-6 w-9 h-9 rounded-full bg-slate-950/70 backdrop-blur border border-slate-700 flex items-center justify-center"
        />

        {images.length > 1 && (
          <span className="absolute bottom-3 right-4 text-[11px] text-white bg-slate-950/70 backdrop-blur rounded-full px-2.5 py-1">
            {images.length} photos · swipe
          </span>
        )}
      </div>

      <div className="px-6 pt-5">
        <h1 className="text-2xl font-bold leading-tight">{item.name}</h1>
        <p className="text-sm text-slate-400 mt-1">
          {item.location}
          {item.rating ? (
            <span className="text-lime-400">
              {' · '}⭐ {String(item.rating)}
              {typeof item.review_count === 'number' ? (
                <span className="text-slate-500">
                  {' '}
                  ({item.review_count.toLocaleString('en-IN')} reviews)
                </span>
              ) : null}
            </span>
          ) : null}
        </p>

        {item.tag ? (
          <span className="inline-block mt-3 text-xs bg-lime-400/20 text-lime-300 px-2.5 py-1 rounded-full font-medium">
            {String(item.tag)}
          </span>
        ) : null}

        {item.description ? (
          <p className="text-slate-300 text-sm leading-relaxed mt-4">{item.description}</p>
        ) : null}
      </div>

      {facts.length > 0 && (
        <div className="px-6 pt-5 grid grid-cols-2 gap-3">
          {facts.map((f) => (
            <div key={f.label} className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3">
              <p className="text-[11px] text-slate-400">{f.label}</p>
              <p className="font-semibold text-sm mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="px-6 pt-5 space-y-3">
        <SaveButton
          itemType={savedType}
          itemId={item.id}
          destination={item.destination}
        />

        <Link
          href={`/trips?new=${encodeURIComponent(item.destination)}`}
          className="block w-full text-center rounded-full bg-lime-400 text-slate-900 font-semibold py-3"
        >
          Plan a trip around this 🗓️
        </Link>
      </div>

      {(item.address || item.maps_url) && (
        <div className="px-6 pt-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Where
          </h2>
          {item.address ? (
            <p className="text-sm text-slate-300 leading-relaxed">{item.address}</p>
          ) : null}
          {item.maps_url ? (
            <a
              href={item.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm text-lime-400"
            >
              Open in Google Maps ↗
            </a>
          ) : null}
        </div>
      )}

      <div className="px-6 pt-6">
        <Link href={backHref} className="text-sm text-slate-400">
          ← More in {item.destination}
        </Link>
      </div>

      {credits.length > 0 && (
        <p className="px-6 pt-6 text-[10px] text-slate-600 leading-relaxed">
          {Array.from(new Set(credits)).join(' · ')}
        </p>
      )}

      {/* Google requires visible attribution wherever Places content is shown. */}
      {item.source === 'places' && (
        <p className="px-6 pt-2 text-[10px] text-slate-600">
          Ratings, photos and details powered by Google
        </p>
      )}

      {/* Screen-reader-only summary of the price, which otherwise only appears
          inside the facts grid in a type-specific format. */}
      <span className="sr-only">{itemPriceLabel(kind, item)}</span>
    </main>
  )
}
