'use client'

import ItemImage from '@/components/ItemImage'
import { CatalogItem, ItemKind, itemPriceLabel } from '@/lib/catalog'

// A row in the "add to day" picker.
//
// Previously the whole row was one button, so any tap added the item — you had
// no way to look before committing. Now tapping the row expands it in place
// (photos, description, rating, address) and adding is a deliberate second
// action. Expanding inline rather than navigating keeps you inside the trip,
// so you don't lose the picker.
export default function PickerRow({
  item,
  kind,
  saved,
  expanded,
  busy,
  dayNumber,
  cityNights,
  cityName,
  onToggleExpand,
  onAdd,
  onAddAllNights,
}: {
  item: CatalogItem
  kind: ItemKind
  saved: boolean
  expanded: boolean
  busy: boolean
  dayNumber: number
  // How many days of this trip are in this city, so a stay can cover the whole
  // leg in one action instead of being added day by day.
  cityNights: number
  cityName: string
  onToggleExpand: () => void
  onAdd: () => void
  onAddAllNights: () => void
}) {
  const priceLabel = itemPriceLabel(kind, item)

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-colors ${
        expanded ? 'bg-slate-900 border-slate-600' : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Tapping the body opens the preview — it no longer adds. */}
        <button
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="flex items-center gap-3 min-w-0 flex-1 text-left"
        >
          <ItemImage
            images={item.images}
            alt={item.name}
            className="w-12 h-12 rounded-lg object-cover shrink-0"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium truncate">
              {saved && <span className="text-rose-400">♥ </span>}
              {item.name}
            </span>
            <span className="block text-xs text-slate-400 truncate">
              {priceLabel || item.location}
              {item.rating ? <span className="text-lime-400"> · ⭐ {item.rating}</span> : null}
            </span>
          </span>
          <span className="text-slate-500 text-xs shrink-0">{expanded ? '▲' : '▼'}</span>
        </button>

        {/* Quick-add stays for people who already know what they want. */}
        <button
          onClick={onAdd}
          disabled={busy}
          aria-label={`Add ${item.name} to day ${dayNumber}`}
          className="w-8 h-8 rounded-full bg-lime-400/15 border border-lime-400/40 text-lime-400 text-lg leading-none shrink-0 disabled:opacity-40"
        >
          +
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3">
          {item.images && item.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory mb-3">
              {item.images.map((src, i) => (
                <ItemImage
                  key={src}
                  images={[src]}
                  alt={`${item.name} — photo ${i + 1}`}
                  className="h-36 w-full shrink-0 snap-center rounded-lg object-cover"
                />
              ))}
            </div>
          )}

          {item.rating ? (
            <p className="text-xs text-slate-400 mb-2">
              <span className="text-lime-400">⭐ {item.rating}</span>
              {typeof item.review_count === 'number'
                ? ` · ${item.review_count.toLocaleString('en-IN')} Google reviews`
                : ''}
            </p>
          ) : null}

          {item.description ? (
            <p className="text-sm text-slate-300 leading-relaxed mb-3">{item.description}</p>
          ) : null}

          {item.address ? (
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">📍 {item.address}</p>
          ) : null}

          {/* A stay usually covers the whole leg. Offering it here saves adding
              the same hotel to four days one at a time. */}
          {kind === 'hotels' && cityNights > 1 && (
            <button
              onClick={onAddAllNights}
              disabled={busy}
              className="w-full mb-2 rounded-full bg-lime-400 text-slate-900 font-semibold py-2.5 text-sm disabled:opacity-40"
            >
              {busy ? 'Adding…' : `Stay all ${cityNights} nights in ${cityName}`}
            </button>
          )}

          <button
            onClick={onAdd}
            disabled={busy}
            className={`w-full rounded-full font-semibold py-2.5 text-sm disabled:opacity-40 ${
              kind === 'hotels' && cityNights > 1
                ? 'border border-slate-700 text-slate-300'
                : 'bg-lime-400 text-slate-900'
            }`}
          >
            {busy ? 'Adding…' : `Add to Day ${dayNumber} only${priceLabel ? ` · ${priceLabel}` : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
