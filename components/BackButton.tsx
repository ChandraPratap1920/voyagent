'use client'

import { useRouter } from 'next/navigation'

// A plain <Link> back to /explore is a *forward* navigation: the list remounts
// and loses your tab, filters and scroll position. Going through history
// instead lets the browser restore all of it. The href is the fallback for
// when there's no history to go back to (direct link, refresh, new tab).
export default function BackButton({
  fallbackHref,
  label = 'Back',
  className,
}: {
  fallbackHref: string
  label?: string
  className?: string
}) {
  const router = useRouter()

  return (
    <button
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) router.back()
        else router.push(fallbackHref)
      }}
      aria-label={label}
      className={className}
    >
      ←
    </button>
  )
}
