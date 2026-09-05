'use client'

import { useState } from 'react'

// "Getting there" — the travel-in leg of a trip.
//
// Deliberately part of the itinerary rather than a top-level Flights/Trains
// tab: it answers "how do I reach this trip" without pretending to be a
// booking portal. The data is curated and static, and the card says so.

type Flight = {
  id: string
  airline: string
  flight_no: string
  from: string
  arrival_airport: string
  departure: string
  duration_mins: number
  stops: number
  price_inr: number
  tag: string | null
  note: string
}
type Train = {
  id: string
  name: string
  number: string
  from: string
  to_station: string
  departure: string
  duration_mins: number
  classes: string
  price_inr: number
  note: string
}
type Bus = {
  id: string
  operator: string
  type: string
  from: string
  to_stop: string
  departure: string
  duration_mins: number
  price_inr: number
  note: string
}
type Transfer = { hub: string; options: { mode: string; price_inr: number; note: string }[] }

type Data = {
  destination: string
  flights: Flight[]
  trains: Train[]
  buses: Bus[]
  transfer: Transfer | null
}

type Tab = 'flight' | 'train' | 'bus' | 'local'

const TAB_LABELS: Record<Tab, string> = {
  flight: '✈️ Flights',
  train: '🚆 Trains',
  bus: '🚌 Buses',
  local: '🚕 Local',
}

function duration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  return h ? `${h}h` : `${m}m`
}

function money(inr: number): string {
  return `₹${inr.toLocaleString('en-IN')}`
}

export default function GettingThere({ destination }: { destination: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('flight')

  // Fetched on first expand rather than on mount — the trip page already makes
  // several calls and most people open this once, if at all.
  async function toggle() {
    const next = !open
    setOpen(next)
    if (!next || data || loading) return

    setLoading(true)
    try {
      const res = await fetch(`/api/transport?to=${encodeURIComponent(destination)}`)
      if (res.ok) setData(await res.json())
    } catch {
      // Leaving data null renders the unavailable line below.
    } finally {
      setLoading(false)
    }
  }

  // International destinations have no rail or road option from India, so those
  // tabs are hidden rather than shown empty.
  const tabs: Tab[] = data
    ? ([
        data.flights.length && 'flight',
        data.trains.length && 'train',
        data.buses.length && 'bus',
        data.transfer && 'local',
      ].filter(Boolean) as Tab[])
    : []

  const activeTab = tabs.includes(tab) ? tab : tabs[0]

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Getting to {destination}</span>
          <span className="block text-xs text-slate-400 truncate">
            Flights, trains, buses and transfers
          </span>
        </span>
        <span className={`text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          ⌄
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {loading && <p className="text-sm text-slate-400 py-2">Loading options…</p>}

          {!loading && !data && (
            <p className="text-sm text-slate-400 py-2">
              Couldn&apos;t load travel options just now.
            </p>
          )}

          {!loading && data && (
            <>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`text-xs rounded-full px-3 py-1.5 border shrink-0 transition-colors ${
                      activeTab === t
                        ? 'bg-lime-400 text-slate-900 border-lime-400 font-semibold'
                        : 'bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {activeTab === 'flight' &&
                  data.flights.map((f) => (
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

                {activeTab === 'train' &&
                  data.trains.map((t) => (
                    <Row
                      key={t.id}
                      title={`${t.name} · ${t.number}`}
                      meta={`${t.from} → ${t.to_station} · ${t.departure} · ${duration(
                        t.duration_mins
                      )} · ${t.classes}`}
                      note={t.note}
                      price={t.price_inr}
                    />
                  ))}

                {activeTab === 'bus' &&
                  data.buses.map((b) => (
                    <Row
                      key={b.id}
                      title={b.operator}
                      meta={`${b.type} · ${b.from} → ${b.to_stop} · ${b.departure} · ${duration(
                        b.duration_mins
                      )}`}
                      note={b.note}
                      price={b.price_inr}
                    />
                  ))}

                {activeTab === 'local' && data.transfer && (
                  <>
                    <p className="text-xs text-slate-400 pb-1">
                      Arriving at <span className="text-slate-300">{data.transfer.hub}</span>
                    </p>
                    {data.transfer.options.map((o) => (
                      <Row key={o.mode} title={o.mode} note={o.note} price={o.price_inr} />
                    ))}
                  </>
                )}
              </div>

              {/* Says what this is. The alternative — implying live inventory —
                  is the kind of thing that falls apart under one question. */}
              <p className="text-[11px] text-slate-500 leading-relaxed mt-3 pt-3 border-t border-slate-800">
                Indicative options and typical fares, curated rather than live. Voyagent
                doesn&apos;t sell transport yet — book these with the operator directly.
              </p>
            </>
          )}
        </div>
      )}
    </div>
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
    <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5">
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
        <p className="text-sm font-semibold text-lime-400 shrink-0">{money(price)}</p>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5">{note}</p>
    </div>
  )
}
