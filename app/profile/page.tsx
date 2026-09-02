'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = { key: string; emoji: string; title: string; subtitle: string }

type Question = {
  key: 'personality' | 'budget_style' | 'pace'
  title: string
  accent: string // tailwind gradient classes, one per question for visual variety
  options: Option[]
}

const QUESTIONS: Question[] = [
  {
    key: 'personality',
    title: "What's your travel personality?",
    accent: 'from-orange-400 to-pink-500',
    options: [
      { key: 'Beach Potato', emoji: '🏖️', title: 'Beach Potato', subtitle: 'Horizontal. Sunscreen. Snacks. Repeat.' },
      { key: 'Museum Goblin', emoji: '🏛️', title: 'Museum Goblin', subtitle: 'Will read every plaque. EVERY plaque.' },
      { key: 'Snack Strategist', emoji: '🍜', title: 'Snack Strategist', subtitle: 'Plans the trip around meals. Correctly.' },
      { key: 'Adrenaline Gremlin', emoji: '🧗', title: 'Adrenaline Gremlin', subtitle: "If it's not slightly terrifying, why go?" },
    ],
  },
  {
    key: 'budget_style',
    title: 'Your budget style?',
    accent: 'from-emerald-400 to-teal-500',
    options: [
      { key: 'Coupon Ninja', emoji: '🪙', title: 'Coupon Ninja', subtitle: 'Will walk 40 min to save ₹200.' },
      { key: 'Balanced Human', emoji: '⚖️', title: 'Balanced Human', subtitle: 'Spend on food, save on sleep.' },
      { key: 'Treat Yourself', emoji: '💳', title: 'Treat Yourself', subtitle: 'The card said yes.' },
    ],
  },
  {
    key: 'pace',
    title: 'Travel pace?',
    accent: 'from-indigo-400 to-purple-500',
    options: [
      { key: 'Turtle Mode', emoji: '🐢', title: 'Turtle Mode', subtitle: 'One thing per day. Maybe.' },
      { key: 'Casual Stroller', emoji: '🚶', title: 'Casual Stroller', subtitle: 'See stuff, but also naps.' },
      { key: 'Speedrunner', emoji: '⚡', title: 'Speedrunner', subtitle: '14 landmarks. One day. No regrets.' },
    ],
  },
]

export default function ProfilePage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const question = QUESTIONS[step]
  const progress = ((step + 1) / QUESTIONS.length) * 100

  async function selectOption(value: string) {
    if (selected) return // prevent double-taps while the brief confirm animation plays
    setSelected(value)
    const nextAnswers = { ...answers, [question.key]: value }
    setAnswers(nextAnswers)

    // Small delay so the tap registers visually before advancing —
    // otherwise the screen changes instantly and feels glitchy.
    await new Promise((r) => setTimeout(r, 220))

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1)
      setSelected(null)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextAnswers),
      })
      if (!res.ok) throw new Error('Failed to save profile')
      router.push('/home')
    } catch {
      setError("Couldn't save your answers — please try again.")
      setSaving(false)
      setSelected(null)
    }
  }

  function goBack() {
    if (step === 0) return
    setSelected(null)
    setStep(step - 1)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col px-6 py-8 max-w-md mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={goBack}
          disabled={step === 0}
          aria-label="Previous question"
          className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center disabled:opacity-30 shrink-0"
        >
          ←
        </button>
        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${question.accent} transition-all duration-500 ease-out`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-slate-500 shrink-0 w-10 text-right">
          {step + 1}/{QUESTIONS.length}
        </span>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
        <h1 className="text-2xl font-bold mb-6 leading-snug">{question.title}</h1>

        <div className="space-y-3">
          {question.options.map((opt) => {
            const isSelected = selected === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => selectOption(opt.key)}
                disabled={!!selected}
                className={`w-full text-left rounded-2xl border px-4 py-4 flex items-center gap-4 transition-all duration-150 ${
                  isSelected
                    ? `bg-gradient-to-r ${question.accent} border-transparent scale-[0.98]`
                    : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/70 disabled:opacity-40'
                }`}
              >
                <span
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 ${
                    isSelected ? 'bg-white/20' : 'bg-slate-900/70'
                  }`}
                >
                  {opt.emoji}
                </span>
                <span className="min-w-0">
                  <span className={`block font-semibold ${isSelected ? 'text-white' : ''}`}>
                    {opt.title}
                  </span>
                  <span className={`block text-sm ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                    {opt.subtitle}
                  </span>
                </span>
                {isSelected && <span className="ml-auto text-xl shrink-0">✓</span>}
              </button>
            )
          })}
        </div>
      </div>

      {saving && <p className="text-slate-400 text-sm mt-4 text-center">Saving your profile…</p>}
      {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
    </main>
  )
}
