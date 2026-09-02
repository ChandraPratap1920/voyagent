'use client'

import { useState } from 'react'

// Google photo URLs occasionally rot — one was already returning 404 within
// days of syncing. Rather than showing a broken-image icon, fall through the
// remaining photos and finally to a neutral placeholder.
export default function ItemImage({
  images,
  alt,
  className,
  eager = false,
}: {
  images?: string[]
  alt: string
  className?: string
  eager?: boolean
}) {
  const [index, setIndex] = useState(0)
  const list = images ?? []
  const src = list[index]

  if (!src) {
    return (
      <div
        className={`${className ?? ''} bg-slate-800 flex items-center justify-center text-slate-600 text-lg`}
        aria-label={alt}
        role="img"
      >
        🖼️
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? undefined : 'lazy'}
      // Advance past the dead URL; when we run out, the branch above renders.
      onError={() => setIndex((i) => i + 1)}
    />
  )
}
