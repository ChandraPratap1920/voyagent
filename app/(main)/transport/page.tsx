import Link from 'next/link'
import BackButton from '@/components/BackButton'
import destinations from '@/data/destinations.json'
import flights from '@/data/flights.json'
import transport from '@/data/transport.json'

// The Transport section.
//
// Voyagent plans stays, food and things to do — but a trip also has to be
// reached and moved around in. This section shows how transport fits the same
// model, using the curated dataset that already powers "Getting there" inside
// a trip. It is deliberately a design preview: every screen says so, because
// the alternative is implying live inventory we don't have.

export const metadata = { title: 'Transport · Voyagent' }

const counts = {
  flights: flights.length,
  trains: Object.values(transport).reduce((n, c) => n + c.trains.length, 0),
  buses: Object.values(transport).reduce((n, c) => n + c.buses.length, 0),
  cabs: Object.values(transport).reduce((n, c) => n + (c.transfer?.options.length ?? 0), 0),
}

const MODES = [
  {
    slug: 'flights',
    icon: '✈️',
    name: 'Flights',
    blurb: 'Routes into all 16 destinations, from six Indian hubs.',
    count: counts.flights,
  },
  {
    slug: 'trains',
    icon: '🚆',
    name: 'Trains',
    blurb: 'Named services and classes on the routes that actually run.',
    count: counts.trains,
  },
  {
    slug: 'buses',
    icon: '🚌',
    name: 'Buses',
    blurb: 'State and private operators, sleeper and seater.',
    count: counts.buses,
  },
  {
    slug: 'cabs',
    icon: '🚕',
    name: 'Cabs & transfers',
    blurb: 'Airport transfers and how people get around once there.',
    count: counts.cabs,
  },
] as const

export default function TransportPage() {
  return (
    <main className="pb-24">
      <div className="px-6 pt-8 pb-2 flex items-center gap-3">
        <BackButton
          fallbackHref="/home"
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"
        />
        <h1 className="text-xl font-bold">Transport</h1>
      </div>

      <div className="px-6 pt-2">
        <p className="text-slate-400 text-sm leading-relaxed mb-5">
          A trip isn&apos;t only where you stay and what you do — it&apos;s how you get there and
          how you move once you&apos;ve arrived. Voyagent models all four the same way it models
          stays and experiences.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {MODES.map((m) => (
            <Link
              key={m.slug}
              href={`/transport/${m.slug}`}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4"
            >
              <p className="text-2xl leading-none mb-2">{m.icon}</p>
              <p className="font-semibold text-sm">{m.name}</p>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{m.blurb}</p>
              <p className="text-[11px] text-lime-400 mt-2">{m.count} options</p>
            </Link>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-4 mb-6">
          <p className="text-sm font-semibold mb-2">Already inside your trips</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Open any trip and &ldquo;Getting there&rdquo; shows the same options scoped to that
            destination — so transport is part of the plan rather than a separate errand.
          </p>
        </div>

        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Where this goes next
        </h2>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800 mb-6">
          <Step
            n="1"
            title="Partner inventory"
            body="Live fares and availability through aggregators — a GDS for flights, IRCTC for rail, operator APIs for coaches."
          />
          <Step
            n="2"
            title="Booked in one place"
            body="Transport pays through the same checkout as stays and experiences, and lands on the right day of the itinerary."
          />
          <Step
            n="3"
            title="Travel-day awareness"
            body="Check-in reminders, PNR status and delays surfaced against the day they affect."
          />
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          This section is a design preview built on a curated dataset of {destinations.length}{' '}
          destinations. Fares and timings are indicative and nothing here is bookable — the
          integration work above is what makes it live.
        </p>
      </div>
    </main>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="px-4 py-3 flex gap-3">
      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-slate-400 leading-relaxed mt-0.5">{body}</span>
      </span>
    </div>
  )
}
