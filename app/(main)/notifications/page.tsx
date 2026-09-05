import Link from 'next/link'
import { redirect } from 'next/navigation'
import BackButton from '@/components/BackButton'
import { createClient } from '@/lib/supabase-server'
import { buildNotifications } from '@/lib/notifications-server'

export const metadata = { title: 'Notifications · Voyagent' }

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const items = await buildNotifications(supabase, user.id)

  return (
    <main className="pb-24">
      <div className="px-6 pt-8 pb-4 flex items-center gap-3">
        <BackButton
          fallbackHref="/home"
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"
        />
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>

      {items.length === 0 ? (
        <div className="px-6">
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-8 text-center">
            <p className="text-3xl mb-2">🔔</p>
            <p className="font-semibold mb-1">Nothing needs you right now</p>
            <p className="text-slate-400 text-sm mb-4">
              Trips starting soon, days still empty and new bookings show up here.
            </p>
            <Link
              href="/explore"
              className="inline-block rounded-full bg-lime-400 text-slate-900 font-semibold px-5 py-2 text-sm"
            >
              Find somewhere to go
            </Link>
          </div>
        </div>
      ) : (
        <div className="px-6 space-y-2">
          {items.map((n) => (
            <Link
              key={n.id}
              href={n.href}
              className="flex items-start gap-3 rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3.5"
            >
              <span className="text-lg leading-none mt-0.5 shrink-0">{n.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-snug">{n.title}</span>
                <span className="block text-xs text-slate-400 mt-0.5">{n.body}</span>
              </span>
              <span className="text-slate-500 shrink-0">›</span>
            </Link>
          ))}
        </div>
      )}

      {/* Says what this is, rather than implying a push-notification system. */}
      <p className="px-6 pt-6 text-[11px] text-slate-500 leading-relaxed">
        These are worked out from your trips, bookings and saved places — there&apos;s nothing to
        mark as read. Each one disappears once you&apos;ve dealt with it.
      </p>
    </main>
  )
}
