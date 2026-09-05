'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TripBooking from '@/components/TripBooking'
import PickerRow from '@/components/PickerRow'
import { CatalogItem, ItemKind, SAVED_TYPE, SavedType, detailHref, itemPriceLabel } from '@/lib/catalog'

type TripItem = {
  id: string
  item_type: SavedType
  item_id: string
  kind: ItemKind
  item: CatalogItem | null
}

type TripDay = {
  day_number: number
  destination: string
  items: TripItem[]
  has: { hotel: boolean; restaurant: boolean; experience: boolean }
}

type Trip = {
  id: string
  title: string | null
  start_date: string | null
  travelers: number
  budget_inr: number | null
  status: string
  days: TripDay[]
  destinations: string[]
  planned_pct: number
  estimated_total_inr: number
  bookable_total_inr: number
}

const PICKER_TABS: [ItemKind, string][] = [
  ['hotels', '🏨 Stay'],
  ['restaurants', '🍽️ Eat'],
  ['experiences', '⚡ Do'],
]

// A day feels "complete" when it has somewhere to sleep, somewhere to eat and
// something to do — that trio drives the little meter on each day card.
const SLOTS: [keyof TripDay['has'], string][] = [
  ['hotel', '🛏'],
  ['restaurant', '🍽'],
  ['experience', '⚡'],
]

export default function TripPlanner({ tripId }: { tripId: string }) {
  const router = useRouter()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [picker, setPicker] = useState<{ day: number; destination: string } | null>(null)
  const [pickerTab, setPickerTab] = useState<ItemKind>('hotels')
  const [pickerItems, setPickerItems] = useState<CatalogItem[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [pickerLoading, setPickerLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadTrip = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}`)
      if (res.ok) setTrip(await res.json())
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    loadTrip()
  }, [loadTrip])

  // Load the picker's options whenever it opens or its tab changes. Saved
  // places for this city float to the top — that's the whole point of Save.
  useEffect(() => {
    if (!picker) return
    let cancelled = false

    async function load() {
      setPickerLoading(true)
      try {
        const [listRes, savedRes] = await Promise.all([
          fetch(`/api/${pickerTab}?destination=${encodeURIComponent(picker!.destination)}`),
          fetch('/api/saved'),
        ])
        const list: CatalogItem[] = listRes.ok ? await listRes.json() : []
        const saved: { item_id: string }[] = savedRes.ok ? await savedRes.json() : []
        if (!cancelled) {
          setSavedIds(new Set(saved.map((s) => s.item_id)))
          setPickerItems(list)
        }
      } catch {
        if (!cancelled) setPickerItems([])
      } finally {
        if (!cancelled) setPickerLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [picker, pickerTab])

  async function addItem(item: CatalogItem) {
    if (!picker || busy) return
    setBusy(true)
    try {
      await fetch(`/api/trips/${tripId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_number: picker.day,
          item_type: SAVED_TYPE[pickerTab],
          item_id: item.id,
        }),
      })
      await loadTrip()
      setPicker(null)
    } finally {
      setBusy(false)
    }
  }

  async function deleteTrip() {
    if (busy) return
    setBusy(true)
    try {
      await fetch(`/api/trips/${tripId}`, { method: 'DELETE' })
      router.push('/trips')
    } finally {
      setBusy(false)
    }
  }

  // Adds one place to several days at once — the API upserts, so overlapping
  // with a day that already has it is a no-op rather than an error.
  async function addItemToDays(item: CatalogItem, dayNumbers: number[]) {
    if (!picker || busy) return
    setBusy(true)
    try {
      await Promise.all(
        dayNumbers.map((day) =>
          fetch(`/api/trips/${tripId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              day_number: day,
              item_type: SAVED_TYPE[pickerTab],
              item_id: item.id,
            }),
          })
        )
      )
      await loadTrip()
      setPicker(null)
    } finally {
      setBusy(false)
    }
  }

  async function removeItem(rowId: string) {
    if (busy) return
    setBusy(true)
    try {
      await fetch(`/api/trips/${tripId}/items?row_id=${encodeURIComponent(rowId)}`, {
        method: 'DELETE',
      })
      await loadTrip()
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="px-6 pt-10 text-slate-400 text-sm">Loading your trip…</p>
  if (!trip) return <p className="px-6 pt-10 text-slate-400 text-sm">Trip not found.</p>

  const overBudget = trip.budget_inr ? trip.estimated_total_inr > trip.budget_inr : false
  // Every day of this trip that sits in the picker's city — a hotel added
  // "for all nights" lands on each of them.
  const cityDayNumbers = picker
    ? trip.days.filter((d) => d.destination === picker.destination).map((d) => d.day_number)
    : []
  const sortedSaved = [...pickerItems].sort(
    (a, b) => Number(savedIds.has(b.id)) - Number(savedIds.has(a.id))
  )

  return (
    <main className="pb-24">
      <div className="px-6 pt-8 pb-2 flex items-center gap-3">
        <Link
          href="/trips"
          aria-label="Back to trips"
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight truncate">
            {trip.title ?? 'Your trip'}
          </h1>
          <p className="text-xs text-slate-400">
            {trip.destinations.join(' → ')} · {trip.days.length} days · {trip.travelers}{' '}
            traveler{trip.travelers === 1 ? '' : 's'}
            {trip.start_date ? ` · from ${trip.start_date}` : ''}
          </p>
        </div>

        {/* The other half of the chat/trips link: Voyagent can start a trip, and
            from inside one you can go back and ask about the same city. */}
        <Link
          href={`/chat?dest=${encodeURIComponent(trip.destinations[0] ?? '')}`}
          aria-label="Ask Voyagent about this trip"
          className="flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 px-3 py-1.5 shrink-0"
        >
          <span className="text-sm leading-none">🦜</span>
          <span className="text-xs font-medium text-slate-300">Ask Voyagent</span>
        </Link>
      </div>

      {/* Progress + budget: the two nudges that bring people back */}
      <div className="px-6 pt-4 space-y-3">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-semibold">{trip.planned_pct}% planned</span>
            {trip.planned_pct === 100 && <span className="text-lime-400 text-xs">All days sorted 🎉</span>}
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-lime-400 transition-all"
              style={{ width: `${trip.planned_pct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-slate-800">
            <span className="text-slate-400">Estimated so far</span>
            <span className={overBudget ? 'text-amber-400 font-semibold' : 'text-lime-400 font-semibold'}>
              ₹{trip.estimated_total_inr.toLocaleString('en-IN')}
              {trip.budget_inr ? (
                <span className="text-slate-500 font-normal">
                  {' '}
                  / ₹{Number(trip.budget_inr).toLocaleString('en-IN')}
                </span>
              ) : null}
            </span>
          </div>
          {overBudget && (
            <p className="text-amber-400 text-xs mt-1">
              Over budget — try a lighter stay or drop an activity.
            </p>
          )}
        </div>
      </div>

      {/* Book — the loop-closer. Sits above the days so it's reachable without
          scrolling past a week of plans. */}
      <div className="px-6 pt-3">
        <TripBooking
          tripId={trip.id}
          title={trip.title ?? 'Your trip'}
          destinations={trip.destinations}
          bookableTotalInr={trip.bookable_total_inr}
          planOnlyInr={trip.estimated_total_inr - trip.bookable_total_inr}
          status={trip.status}
          onBooked={loadTrip}
        />
      </div>

      {/* Days */}
      <div className="px-6 pt-5 space-y-4">
        {trip.days.map((day) => (
          <div key={day.day_number} className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-sm">Day {day.day_number}</p>
                <p className="text-xs text-slate-400">{day.destination}</p>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                {SLOTS.map(([slot, icon]) => (
                  <span
                    key={slot}
                    title={slot}
                    className={`text-sm ${day.has[slot] ? '' : 'opacity-25 grayscale'}`}
                  >
                    {icon}
                  </span>
                ))}
              </div>
            </div>

            {day.items.length === 0 ? (
              <p className="text-xs text-slate-500 mb-3">Nothing planned yet.</p>
            ) : (
              <div className="space-y-2 mb-3">
                {day.items
                  .filter((i) => i.item)
                  .map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2"
                    >
                      {row.item!.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.item!.images![0]}
                          alt={row.item!.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                          loading="lazy"
                        />
                      ) : null}
                      <Link href={detailHref(row.kind, row.item_id)} className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{row.item!.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {itemPriceLabel(row.kind, row.item!) || row.item!.location}
                        </p>
                      </Link>
                      <button
                        onClick={() => removeItem(row.id)}
                        aria-label={`Remove ${row.item!.name}`}
                        className="text-slate-500 text-sm shrink-0 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
              </div>
            )}

            <button
              onClick={() => {
                setPickerTab('hotels')
                setPicker({ day: day.day_number, destination: day.destination })
              }}
              className="w-full rounded-xl border border-dashed border-slate-700 py-2 text-sm text-slate-300"
            >
              + Add to Day {day.day_number}
            </button>
          </div>
        ))}
      </div>

      <div className="px-6 pt-8">
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="w-full rounded-full border border-slate-800 text-slate-400 text-sm py-2.5"
          >
            Delete this trip
          </button>
        ) : (
          <div className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-4">
            <p className="text-sm text-red-200 mb-1 font-medium">Delete this trip?</p>
            <p className="text-xs text-red-300/80 mb-3">
              All {trip.days.length} days and everything planned in them will be gone. This
              can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={deleteTrip}
                disabled={busy}
                className="flex-1 rounded-full bg-red-500 text-white font-semibold py-2.5 text-sm disabled:opacity-50"
              >
                {busy ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 rounded-full border border-slate-700 text-slate-300 py-2.5 text-sm"
              >
                Keep it
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Picker sheet */}
      {picker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-950 border-t border-slate-800 rounded-t-3xl max-h-[80vh] flex flex-col">
            <div className="px-6 pt-5 pb-3 flex items-center justify-between shrink-0">
              <div>
                <p className="font-bold">Add to Day {picker.day}</p>
                <p className="text-xs text-slate-400">{picker.destination}</p>
              </div>
              <button
                onClick={() => {
                  setPicker(null)
                  setExpandedId(null)
                }}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="px-6 pb-3 flex gap-2 shrink-0">
              {PICKER_TABS.map(([kind, label]) => (
                <button
                  key={kind}
                  onClick={() => {
                    setPickerTab(kind)
                    setExpandedId(null)
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    pickerTab === kind
                      ? 'bg-lime-400 text-slate-900'
                      : 'bg-slate-900 border border-slate-800 text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="px-6 pb-8 overflow-y-auto space-y-2">
              {pickerLoading && <p className="text-slate-400 text-sm">Loading…</p>}
              {!pickerLoading && sortedSaved.length === 0 && (
                <p className="text-slate-400 text-sm">Nothing here for {picker.destination}.</p>
              )}
              {sortedSaved.map((item) => (
                <PickerRow
                  key={item.id}
                  item={item}
                  kind={pickerTab}
                  saved={savedIds.has(item.id)}
                  expanded={expandedId === item.id}
                  busy={busy}
                  dayNumber={picker.day}
                  cityNights={cityDayNumbers.length}
                  cityName={picker.destination}
                  onToggleExpand={() =>
                    setExpandedId((cur) => (cur === item.id ? null : item.id))
                  }
                  onAdd={() => addItem(item)}
                  onAddAllNights={() => addItemToDays(item, cityDayNumbers)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
