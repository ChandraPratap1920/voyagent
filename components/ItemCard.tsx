'use client'

import Link from 'next/link'
import ItemImage from '@/components/ItemImage'
import { CatalogItem, ItemKind, compactCount, detailHref, itemPriceLabel } from '@/lib/catalog'
import { rememberItem } from '@/lib/scrollMemory'

// Shared card for a hotel / restaurant / experience, used by the Explore tab
// and the destination detail pages. Tapping it opens that item's detail page;
// the heart saves it without leaving the list.
export default function ItemCard({
  kind,
  item,
  saved,
  onToggleSave,
  listKey,
}: {
  kind: ItemKind
  item: CatalogItem
  saved?: boolean
  onToggleSave?: (item: CatalogItem) => void
  // Identifies the list this card belongs to, so returning from the detail
  // page can scroll this exact card back into view.
  listKey?: string
}) {
  return (
    <div className="relative" data-item-id={item.id}>
      <Link
        href={detailHref(kind, item.id)}
        onClick={() => listKey && rememberItem(listKey, item.id, kind)}
        className="block rounded-2xl border border-slate-800 overflow-hidden active:border-slate-600 transition-colors"
      >
        {item.images?.length ? (
          <div className="relative h-32 bg-slate-800">
            <ItemImage images={item.images} alt={item.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-3 right-12">
              <p className="font-semibold text-white text-sm truncate">{item.name}</p>
              <p className="text-xs text-slate-300 truncate">{item.location}</p>
            </div>
          </div>
        ) : (
          <div className="px-4 pt-3 pr-12">
            <p className="font-semibold text-sm">{item.name}</p>
            <p className="text-xs text-slate-400">{item.location}</p>
          </div>
        )}
        <div className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-400 min-w-0 truncate">{itemPriceLabel(kind, item)}</span>
          {item.rating ? (
            <span className="text-lime-400 shrink-0">
              ⭐ {String(item.rating)}
              {typeof item.review_count === 'number' ? (
                <span className="text-slate-500"> ({compactCount(item.review_count)})</span>
              ) : null}
            </span>
          ) : null}
        </div>
      </Link>

      {/* Sits above the Link, so saving never navigates away. */}
      {onToggleSave && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleSave(item)
          }}
          aria-label={saved ? `Remove ${item.name} from saved` : `Save ${item.name}`}
          aria-pressed={!!saved}
          className={`absolute top-2 right-2 w-9 h-9 rounded-full backdrop-blur border flex items-center justify-center text-lg transition-colors ${
            saved
              ? 'bg-rose-500/20 border-rose-400 text-rose-400'
              : 'bg-slate-950/70 border-slate-700 text-slate-200'
          }`}
        >
          {saved ? '♥' : '♡'}
        </button>
      )}
    </div>
  )
}
