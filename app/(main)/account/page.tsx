'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

type Profile = {
  full_name: string | null
  personality: string | null
  budget_style: string | null
  pace: string | null
}

export default function AccountPage() {
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setEmail(user.email ?? '')
        const { data } = await supabase
          .from('profiles')
          .select('full_name, personality, budget_style, pace')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="pb-24">
      <div className="px-6 pt-8 pb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">Account</h1>
      </div>

      {loading && <p className="px-6 text-slate-400 text-sm">Loading…</p>}

      {!loading && (
        <>
          <div className="px-6 mb-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center text-slate-900 font-bold text-2xl shrink-0">
              {(profile?.full_name ?? email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{profile?.full_name ?? 'Traveler'}</p>
              <p className="text-slate-400 text-sm truncate">{email}</p>
            </div>
          </div>

          <div className="px-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Your Voyager Profile
            </h2>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800">
              <ProfileRow label="Travel personality" value={profile?.personality} />
              <ProfileRow label="Budget style" value={profile?.budget_style} />
              <ProfileRow label="Travel pace" value={profile?.pace} />
            </div>
            <Link
              href="/profile"
              className="block text-center text-lime-400 text-sm mt-3 rounded-full border border-slate-800 py-2.5"
            >
              Retake the quiz
            </Link>
          </div>

          <div className="px-6">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full rounded-full border border-red-900 text-red-300 font-semibold py-3 disabled:opacity-50"
            >
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </>
      )}
    </main>
  )
}

function ProfileRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  )
}
