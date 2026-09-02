'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/home')
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-center px-6 py-12 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-1">Welcome back</h1>
      <p className="text-slate-400 mb-8">Log in to continue your journey</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">Email address</label>
          <input
            type="email"
            className="w-full mt-1 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 outline-none focus:border-lime-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="aria@example.com"
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">Password</label>
          <input
            type="password"
            className="w-full mt-1 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 outline-none focus:border-lime-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-lime-400 text-slate-900 font-semibold py-3 mt-2 disabled:opacity-60"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="text-center text-slate-400 mt-8">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-lime-400 font-medium">
          Sign up
        </Link>
      </p>
    </main>
  )
}
