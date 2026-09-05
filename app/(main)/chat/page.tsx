'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useTrip, ParsedTrip } from '@/context/TripContext'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { matchCity, CITY_NAMES } from '@/lib/destinations'

const AGENT_STAGES = [
  'Research Agent scouting options…',
  'Budget Agent crunching numbers…',
  'Booking Agent lining things up…',
]

const STAGE_DURATION_MS = 900 // purely cosmetic pacing for the staged animation

function ChatPageInner() {
  const searchParams = useSearchParams()

  // Prefill from ?dest=… on first render — this component is inside a Suspense
  // boundary, so it is always client-rendered and the param is available here.
  const [message, setMessage] = useState(() => {
    const dest = searchParams.get('dest')
    return dest ? `I want to go to ${dest} — ` : ''
  })
  const [loading, setLoading] = useState(false)
  const [stageIndex, setStageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ParsedTrip | null>(null)
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const { setParsedTrip } = useTrip()
  const router = useRouter()
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Voyagent can name any city on earth; only these have a catalogue behind them.
  const matchedCity = matchCity(result?.destination)

  useEffect(() => {
    return () => {
      if (stageTimer.current) clearInterval(stageTimer.current)
    }
  }, [])

  function resetConversation() {
    setMessage('')
    setResult(null)
    setError(null)
    setLoading(false)
    setConfirmingReset(false)
    setCreateError(null)
  }

  async function handleSend() {
    if (!message.trim() || loading) return

    setError(null)
    setResult(null)
    setLoading(true)
    setStageIndex(0)

    // Cosmetic staged animation — cycles through agent labels while the
    // single real Claude call below is actually in flight.
    stageTimer.current = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, AGENT_STAGES.length - 1))
    }, STAGE_DURATION_MS)

    try {
      const res = await fetch('/api/parse-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) throw new Error('Trip parsing failed')
      const parsed: ParsedTrip = await res.json()

      // Make sure the animation has cycled through at least once before
      // showing the result, so it doesn't flash instantly on a fast reply.
      const elapsed = STAGE_DURATION_MS * AGENT_STAGES.length
      await new Promise((r) => setTimeout(r, Math.max(0, elapsed - 0)))

      setResult(parsed)
      setParsedTrip(parsed)
    } catch {
      setError("Voyagent couldn't quite catch that — try rephrasing with destination, days, budget, and travelers.")
    } finally {
      if (stageTimer.current) clearInterval(stageTimer.current)
      setLoading(false)
    }
  }

  function goToResults() {
    router.push('/results')
  }

  // The parse used to live only in React state, so a refresh lost it. Writing a
  // real trip row here is what makes Voyagent's plan show up in Trips and survive.
  async function createTrip() {
    if (!matchedCity || creating) return

    setCreating(true)
    setCreateError(null)

    const nights = Math.min(Math.max(result?.duration_days ?? 3, 1), 30)

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs: [{ destination: matchedCity, nights }],
          title: `${nights}-day ${matchedCity} trip`,
          travelers: result?.travelers ?? 1,
          budget_inr: result?.budget_inr ?? null,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setCreateError(data?.error ?? 'Could not create that trip. Please try again.')
        return
      }

      router.push(`/trips/${data.id}`)
    } catch {
      setCreateError('Could not create that trip. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="flex flex-col max-w-md mx-auto w-full pb-24">
      <div className="px-6 pt-6 pb-4 flex items-center gap-3">
        <Link
          href="/home"
          aria-label="Back to home"
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0"
        >
          ←
        </Link>

        <div className="w-11 h-11 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xl shrink-0">
          🦜
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-lg leading-tight">Voyagent</h1>
          <p className="text-slate-400 text-sm leading-tight">your AI travel agent</p>
        </div>

        {(result || error) && !confirmingReset && (
          <button
            onClick={() => setConfirmingReset(true)}
            className="text-xs text-slate-400 border border-slate-800 rounded-full px-3 py-1.5 shrink-0"
          >
            Start over
          </button>
        )}
        {confirmingReset && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={resetConversation}
              className="text-xs text-red-300 border border-red-900 bg-red-950/50 rounded-full px-3 py-1.5"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmingReset(false)}
              className="text-xs text-slate-400 border border-slate-800 rounded-full px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 px-6 space-y-4 overflow-y-auto pb-4">
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-3 text-sm leading-relaxed max-w-[85%]">
          🦜 Tell me where, when, and your budget — I&apos;ll stream you a real plan.
        </div>

        {loading && (
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-3 text-sm text-indigo-300 max-w-[85%] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            {AGENT_STAGES[stageIndex]}
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-950/60 border border-red-900 px-4 py-3 text-sm text-red-300 max-w-[85%]">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-4 max-w-[92%] space-y-3">
            <p className="text-sm text-slate-400">Here&apos;s what I picked up — check it over:</p>

            <FormField
              label="Destination"
              value={matchedCity ?? result.destination ?? '— (tell me where!)'}
            />
            <FormField
              label="Duration"
              value={result.duration_days ? `${result.duration_days} days` : '— (how many days?)'}
            />
            <FormField
              label="Budget"
              value={result.budget_inr ? `₹${result.budget_inr.toLocaleString('en-IN')}` : '— (what budget?)'}
            />
            <FormField
              label="Travelers"
              value={result.travelers ? `${result.travelers}` : '— (how many people?)'}
            />

            {/* Somewhere Voyagent's parse can actually land. This writes a real
                trip with its days already laid out, so it appears in Trips and
                survives a refresh — the old flow held it in memory only. */}
            {matchedCity && (
              <button
                onClick={createTrip}
                disabled={creating}
                className="w-full rounded-full bg-lime-400 text-slate-900 font-semibold py-2.5 mt-2 disabled:opacity-60"
              >
                {creating ? 'Creating your trip…' : 'Create this trip 🗓️'}
              </button>
            )}

            {matchedCity && (
              <button
                onClick={goToResults}
                className="w-full rounded-full border border-slate-700 text-slate-300 font-medium py-2.5"
              >
                Just book a flight + hotel
              </button>
            )}

            {createError && <p className="text-red-400 text-sm">{createError}</p>}

            {/* Voyagent will happily parse "Paris" — say so plainly rather than
                creating a trip whose days have nothing to fill them with. */}
            {result.destination && !matchedCity && (
              <div className="rounded-xl border border-amber-900 bg-amber-950/40 px-3 py-2.5 text-xs text-amber-200 leading-relaxed">
                We don&apos;t cover {result.destination} yet — Voyagent has {CITY_NAMES.length}{' '}
                destinations so far.{' '}
                <Link href="/explore" className="underline font-medium">
                  See where we go
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 pb-8 pt-2">
        <div className="flex items-center gap-2 rounded-full bg-slate-900 border border-slate-700 px-4 py-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder='Try "5 days in Bali under ₹60K for 2"'
            disabled={loading}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            ↑
          </button>
        </div>
      </div>
    </main>
  )
}

function FormField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-slate-800 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  )
}
