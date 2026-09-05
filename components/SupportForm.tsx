'use client'

import { useEffect, useState } from 'react'

// The contact half of /support. Split out from the page so the FAQ above it
// stays a server component and ships no JavaScript.

const CATEGORIES = [
  { value: 'booking', label: 'Booking & payment' },
  { value: 'planning', label: 'Trip planning' },
  { value: 'account', label: 'My account' },
  { value: 'bug', label: "Something's broken" },
  { value: 'other', label: 'Something else' },
] as const

const MAX_MESSAGE = 2000

type Ticket = {
  id: string
  category: string
  subject: string
  status: string
  created_at: string
}

// Tickets are keyed by uuid, which is not something anyone can read out over
// the phone — the first block is short enough to quote and still unique here.
function ticketRef(id: string): string {
  return `VOY-${id.slice(0, 6).toUpperCase()}`
}

function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export default function SupportForm() {
  const [category, setCategory] = useState<string>('booking')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentRef, setSentRef] = useState<string | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/support')
        const data = res.ok ? await res.json() : []
        if (!cancelled) setTickets(data)
      } catch {
        if (!cancelled) setTickets([])
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject, message }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error ?? 'Could not send that just now. Please try again.')
        return
      }

      setSentRef(ticketRef(data.id))
      setSubject('')
      setMessage('')
      setTickets((prev) => [
        {
          id: data.id,
          category,
          subject,
          status: 'open',
          created_at: data.created_at ?? new Date().toISOString(),
        },
        ...prev,
      ])
    } catch {
      setError('Could not send that just now. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sentRef) {
    return (
      <div className="rounded-2xl border border-lime-900 bg-lime-950/40 p-5 text-center">
        <p className="text-3xl mb-2">✅</p>
        <p className="font-semibold mb-1">We&apos;ve got your message</p>
        <p className="text-sm text-slate-400">
          Your reference is <span className="font-mono text-lime-400">{sentRef}</span>. We usually
          reply within 24 hours.
        </p>
        <button
          onClick={() => setSentRef(null)}
          className="mt-4 rounded-full border border-slate-700 text-slate-300 text-sm font-medium px-5 py-2"
        >
          Raise another
        </button>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400">
            What&apos;s it about?
          </label>
          <div className="flex flex-wrap gap-2 mt-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                  category === c.value
                    ? 'bg-lime-400 text-slate-900 border-lime-400 font-semibold'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="support-subject" className="text-xs uppercase tracking-wide text-slate-400">
            Subject
          </label>
          <input
            id="support-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            required
            placeholder="Payment went through but no confirmation"
            className="w-full mt-1 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm outline-none focus:border-lime-400 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label htmlFor="support-message" className="text-xs uppercase tracking-wide text-slate-400">
            Tell us what happened
          </label>
          <textarea
            id="support-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_MESSAGE}
            required
            rows={5}
            placeholder="The more detail the better — which trip, which screen, and what you expected to happen."
            className="w-full mt-1 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm outline-none focus:border-lime-400 resize-none placeholder:text-slate-600"
          />
          <p className="text-right text-[11px] text-slate-500 mt-1">
            {message.length}/{MAX_MESSAGE}
          </p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={sending || !subject.trim() || !message.trim()}
          className="w-full rounded-full bg-lime-400 text-slate-900 font-semibold py-3 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send message'}
        </button>
      </form>

      {tickets.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Your recent requests
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800">
            {tickets.map((t) => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium leading-snug">{t.subject}</p>
                  <span
                    className={`text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0 ${
                      t.status === 'resolved'
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-amber-950 text-amber-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {ticketRef(t.id)} · {categoryLabel(t.category)} ·{' '}
                  {new Date(t.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
