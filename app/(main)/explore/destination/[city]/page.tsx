import { notFound } from 'next/navigation'
import Link from 'next/link'
import destinations from '@/data/destinations.json'
import DestinationBrowser from './DestinationBrowser'
import BackButton from '@/components/BackButton'

// Only 4 curated cities, so prerender all of them at build time.
export function generateStaticParams() {
  return destinations.map((d) => ({ city: d.slug }))
}

export default async function DestinationPage({ params }: { params: Promise<{ city: string }> }) {
  // Next 16: params is a Promise and must be awaited.
  const { city } = await params
  const destination = destinations.find((d) => d.slug === city.toLowerCase())

  if (!destination) notFound()

  const hero = destination.images[0]
  const heroCredit = destination.image_credits[0]

  return (
    <main className="pb-24">
      {/* Hero */}
      <div className="relative h-64 bg-slate-800">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt={destination.name} className="w-full h-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/30" />

        <BackButton
          fallbackHref="/explore"
          label="Back to explore"
          className="absolute top-6 left-6 w-9 h-9 rounded-full bg-slate-950/70 backdrop-blur border border-slate-700 flex items-center justify-center"
        />

        <div className="absolute bottom-4 left-6 right-6">
          <h1 className="text-3xl font-bold leading-tight">{destination.name}</h1>
          <p className="text-sm text-lime-400 font-medium">{destination.tagline}</p>
        </div>

        {heroCredit ? (
          <span className="absolute top-6 right-6 text-[10px] text-slate-300/70 max-w-[45%] text-right leading-tight">
            {heroCredit}
          </span>
        ) : null}
      </div>

      <div className="px-6 pt-5">
        <p className="text-slate-300 text-sm leading-relaxed">{destination.overview}</p>
      </div>

      {/* Quick facts — static copy, not live weather (explicitly out of MVP scope) */}
      <div className="px-6 pt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3">
          <p className="text-[11px] text-slate-400">Best time to go</p>
          <p className="font-semibold text-sm mt-0.5">{destination.best_time}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3">
          <p className="text-[11px] text-slate-400">Flights from</p>
          <p className="font-semibold text-sm mt-0.5">
            ₹{destination.from_price_inr.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Two ways forward: build it yourself, or let Voyagent draft it. Chat is one
          path from discovery now, not the only one. */}
      <div className="px-6 pt-5 space-y-3">
        <Link
          href={`/trips?new=${encodeURIComponent(destination.name)}`}
          className="block w-full text-center rounded-full bg-lime-400 text-slate-900 font-semibold py-3"
        >
          Start a trip to {destination.name} 🗓️
        </Link>
        <Link
          href={`/chat?dest=${encodeURIComponent(destination.name)}`}
          className="block w-full text-center rounded-full border border-slate-700 text-slate-300 font-medium py-3"
        >
          Ask Voyagent to plan it 🦜
        </Link>
      </div>

      <div className="px-6 pt-7">
        <h2 className="font-bold mb-3">What&apos;s in {destination.name}</h2>
        <DestinationBrowser destination={destination.name} />
      </div>
    </main>
  )
}
