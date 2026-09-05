import Link from 'next/link'
import { notFound } from 'next/navigation'
import BackButton from '@/components/BackButton'
import destinations from '@/data/destinations.json'
import flights from '@/data/flights.json'
import transport from '@/data/transport.json'

type Mode = 'flights' | 'trains' | 'buses' | 'cabs'
type CityKey = keyof typeof transport

const MODES: Record<Mode, { icon: string; name: string; roadmap: string[] }> = {
  flights: {
    icon: '✈️',
    name: 'Flights',
    roadmap: [
      'Live fares and seat maps through a GDS or aggregator',
      'Fare tracking, so a watched route tells you when it drops',
      'Baggage rules and web check-in surfaced on the day they matter',
    ],
  },
  trains: {
    icon: '🚆',
    name: 'Trains',
    roadmap: [
      'Live availability and PNR status through IRCTC',
      'Waitlist confirmation odds before you commit',
      'Berth preference and platform alerts on the day of travel',
    ],
  },
  buses: {
    icon: '🚌',
    name: 'Buses',
    roadmap: [
      'Operator seat maps and live inventory through an aggregator',
      'Boarding-point selection rather than a city name',
      'Live tracking on the night you travel',
    ],
  },
  cabs: {
    icon: '🚕',
    name: 'Cabs & transfers',
    roadmap: [
      'Pre-booked airport transfers tied to your arrival time',
      'Deep links into the ride app that actually operates locally',
      'Day-hire with a driver, priced against the places on that day',
    ],
  },
}

function isMode(v: string): v is Mode {
  return v in MODES
}

function duration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

export default async function TransportModePage({
  params,
  searchParams,
}: {
  // Both are Promises in this version of Next and must be awaited.
  params: Promise<{ mode: string }>
  searchParams: Promise<{ city?: string }>
}) {
  const { mode } = await params
  const { city: cityParam } = await searchParams

  if (!isMode(mode)) notFound()
  const meta = MODES[mode]

  // Only cities that actually have something for this mode get a chip —
  // there is no rail or road route to Bali from India, and offering an empty
  // tab would be worse than leaving it out.
  const cities = destinations
    .map((d) => d.name)
    .filter((name) => {
      const local = transport[name as CityKey]
      if (mode === 'flights') return flights.some((f) => f.to === name)
      if (mode === 'trains') return (local?.trains.length ?? 0) > 0
      if (mode === 'buses') return (local?.buses.length ?? 0) > 0
      return !!local?.transfer
    })

  const city = cityParam && cities.includes(cityParam) ? cityParam : cities[0]
  const local = transport[city as CityKey]

  return (
    <main className="pb-24">
      <div className="px-6 pt-8 pb-2 flex items-center gap-3">
        <BackButton
          fallbackHref="/transport"
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"
        />
        <h1 className="text-xl font-bold">
          {meta.icon} {meta.name}
        </h1>
      </div>

      <div className="px-6 pt-3">
        <p className="text-xs text-slate-400 mb-2">
          {mode === 'cabs' ? 'Getting around in' : 'Travelling to'}
        </p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-6 px-6">
          {cities.map((c) => (
            <Link
              key={c}
              href={`/transport/${mode}?city=${encodeURIComponent(c)}`}
              scroll={false}
              className={`text-xs rounded-full px-3 py-1.5 border shrink-0 ${
                c === city
                  ? 'bg-lime-400 text-slate-900 border-lime-400 font-semibold'
                  : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}
            >
              {c}
            </Link>
          ))}
        </div>
      </div>

      <div className="px-6 pt-5 space-y-2">
        {mode === 'flights' &&
          flights
            .filter((f) => f.to === city)
            .map((f) => (
              <Row
                key={f.id}
                title={`${f.airline} ${f.flight_no}`}
                meta={`${f.from} → ${f.arrival_airport} · ${f.departure} · ${duration(
                  f.duration_mins
                )} · ${f.stops === 0 ? 'non-stop' : `${f.stops} stop`}`}
                note={f.note}
                price={f.price_inr}
                tag={f.tag}
              />
            ))}

        {mode === 'trains' &&
          local?.trains.map((t) => (
            <Row
              key={t.id}
              title={`${t.name} · ${t.number}`}
              meta={`${t.from} → ${t.to_station} · ${t.departure} · ${duration(t.duration_mins)} · ${t.classes}`}
              note={t.note}
              price={t.price_inr}
            />
          ))}

        {mode === 'buses' &&
          local?.buses.map((b) => (
            <Row
              key={b.id}
              title={b.operator}
              meta={`${b.type} · ${b.from} → ${b.to_stop} · ${b.departure} · ${duration(b.duration_mins)}`}
              note={b.note}
              price={b.price_inr}
            />
          ))}

        {mode === 'cabs' && local?.transfer && (
          <>
            <p className="text-xs text-slate-400 pb-1">
              Arriving at <span className="text-slate-300">{local.transfer.hub}</span>
            </p>
            {local.transfer.options.map((o) => (
              <Row key={o.mode} title={o.mode} note={o.note} price={o.price_inr} />
            ))}
          </>
        )}
      </div>

      <div className="px-6 pt-7">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          What making this live takes
        </h2>
        <ul className="rounded-2xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800">
          {meta.roadmap.map((line) => (
            <li key={line} className="px-4 py-3 text-xs text-slate-300 leading-relaxed flex gap-2.5">
              <span className="text-slate-600">→</span>
              {line}
            </li>
          ))}
        </ul>

        <p className="text-[11px] text-slate-500 leading-relaxed mt-4">
          Design preview. Timings and fares are typical rather than live, and nothing on this page
          is bookable yet.
        </p>
      </div>
    </main>
  )
}

function Row({
  title,
  meta,
  note,
  price,
  tag,
}: {
  title: string
  meta?: string
  note: string
  price: number
  tag?: string | null
}) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">
            {title}
            {tag && (
              <span className="ml-2 text-[10px] uppercase tracking-wide text-lime-400 border border-lime-900 rounded-full px-1.5 py-0.5">
                {tag}
              </span>
            )}
          </p>
          {meta && <p className="text-[11px] text-slate-400 mt-0.5">{meta}</p>}
        </div>
        <p className="text-sm font-semibold text-lime-400 shrink-0">{inr(price)}</p>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5">{note}</p>
    </div>
  )
}
