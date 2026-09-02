'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/home', label: 'Home', icon: '🏠' },
  { href: '/explore', label: 'Explore', icon: '🧭' },
  { href: '/trips', label: 'Trips', icon: '🗓️' },
  { href: '/chat', label: 'Plan', icon: '🦜' },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur border-t border-slate-800 px-3 py-2 flex items-center justify-around z-40">
      {TABS.map((tab) => {
        // /results and /account aren't tabs themselves, but /chat and /trips
        // should stay highlighted while you're inside their sub-pages.
        const isActive =
          pathname === tab.href ||
          (tab.href === '/chat' && pathname.startsWith('/chat')) ||
          (tab.href === '/trips' && pathname.startsWith('/trips')) ||
          (tab.href === '/explore' && pathname.startsWith('/explore'))
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
              isActive ? 'text-lime-400' : 'text-slate-500'
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
