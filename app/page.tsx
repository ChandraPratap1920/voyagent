import Link from 'next/link'
import destinations from '@/data/destinations.json'
import experiences from '@/data/experiences.json'
import hotels from '@/data/hotels.json'
import restaurants from '@/data/restaurants.json'

// Public landing page — the first thing anyone opening the deployed URL sees.
//
// The imagery is pulled from the real catalogue rather than stock photography:
// every tile below is a place or activity you can actually open in the app,
// which is the honest version of a travel-app hero collage.

// Every photo here is an Unsplash URL, which accepts a width parameter. Asking
// for 400px instead of 1080px cuts roughly 90% of the bytes — this is the first
// paint, possibly over conference wifi, so it has to be light.
function thumb(url?: string): string | null {
  if (!url) return null
  return url.replace(/([?&])w=\d+/, '$1w=400').replace(/([?&])q=\d+/, '$1q=70')
}

function pick(ids: string[]): string[] {
  const all = [...experiences, ...hotels, ...restaurants] as { id: string; images?: string[] }[]
  return ids
    .map((id) => thumb(all.find((x) => x.id === id)?.images?.[0]))
    .filter((u): u is string => !!u)
}

function cityHeroes(slugs: string[]): string[] {
  return slugs
    .map((slug) => thumb(destinations.find((d) => d.slug === slug)?.images?.[0]))
    .filter((u): u is string => !!u)
}

// Adrenaline on top, scenery underneath — the two halves of what Voyagent sells.
const ROW_ONE = pick([
  'hot-air-balloon-jaipur',
  'skydive-dubai',
  'bungee-rishikesh',
  'paragliding-manali',
  'scuba-grande-goa',
  'rafting-rishikesh',
  'snorkel-reef-maldives',
  'desert-safari-dubai',
  'surf-canggu-bali',
])

const ROW_TWO = [
  ...pick([
    'tea-factory-munnar',
    'ubud-rice-terrace-bali',
    'houseboat-overnight-alleppey',
    'dudhsagar-goa',
    'monsoon-palace-udaipur',
  ]),
  ...cityHeroes(['maldives', 'darjeeling', 'varanasi', 'bali']),
]

function Marquee({ images, reverse }: { images: string[]; reverse?: boolean }) {
  // Rendered twice so the -50% translate loops without a visible seam.
  const doubled = [...images, ...images]

  return (
    <div className="overflow-hidden" aria-hidden="true">
      <div className={`flex gap-3 ${reverse ? 'marquee-track-reverse' : 'marquee-track'}`}>
        {doubled.map((src, i) => (
          <div key={`${src}-${i}`} className="relative shrink-0 w-32 h-24 rounded-xl overflow-hidden bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Landing() {
  const placeCount = hotels.length + restaurants.length + experiences.length

  return (
    <main className="min-h-screen flex flex-col max-w-md mx-auto w-full">
      <div className="px-6 pt-10">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl">🦜</span>
          <span className="font-bold text-lg tracking-tight">Voyagent</span>
        </div>

        <h1 className="text-4xl font-bold leading-[1.1]">
          Explore what
          <br />
          feels right.
          <br />
          <span className="text-lime-400">AI will guide you.</span>
        </h1>

        <p className="text-slate-400 mt-4 leading-relaxed">
          Real stays, food and things to do across {destinations.length} destinations — saved,
          planned day by day, and booked.
        </p>
      </div>

      {/* The collage. Decorative, lazy-loaded, and it never blocks the text above. */}
      <div className="py-7 space-y-3">
        <Marquee images={ROW_ONE} />
        <Marquee images={ROW_TWO} reverse />
      </div>

      <div className="px-6 flex flex-wrap gap-2">
        {[
          `🌍 ${destinations.length} destinations`,
          `📍 ${placeCount}+ real places`,
          '⭐ Google ratings',
        ].map((chip) => (
          <span
            key={chip}
            className="text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-full px-3 py-1.5"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="px-6 pt-8 pb-10 mt-auto space-y-3">
        <Link
          href="/signup"
          className="block w-full text-center rounded-full bg-lime-400 text-slate-900 font-semibold py-3.5"
        >
          Get started — it&apos;s free
        </Link>
        <Link
          href="/login"
          className="block w-full text-center rounded-full border border-slate-700 text-slate-300 font-medium py-3.5"
        >
          I already have an account
        </Link>
      </div>
    </main>
  )
}
