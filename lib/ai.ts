import OpenAI from 'openai'

// Server-side only — never import this into a 'use client' file,
// the API key would leak to the browser.
//
// Using Google's Gemini API through its OpenAI-compatible endpoint —
// same 'openai' SDK, just pointed at Google's servers with a Gemini key.
// Docs: https://ai.google.dev/gemini-api/docs/openai
const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
})

// The evergreen aliases avoid the 404 you get when Google retires a dated
// model name (gemini-2.0-flash, 2.5-flash and 2.5-flash-lite are all 404 now).
// The trade-off is that the model underneath can move: gemini-flash-latest now
// resolves to gemini-3.8-flash, whose free tier allows only 20 requests and
// was returning 429 for every parse. Flash-Lite has its own, larger free quota
// and parses these prompts identically.
const MODEL = 'gemini-flash-lite-latest'

// Gemini returns 429 when the free-tier quota is hit and 503 when the model is
// briefly overloaded. Both are often transient, and a demo shouldn't fall over
// on the first one — but the wait has to stay short enough that someone is
// still looking at the screen.
const RETRY_DELAYS_MS = [1200, 3000]

async function withRetry<T>(call: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call()
    } catch (err) {
      const status = (err as { status?: number })?.status
      const retryable = status === 429 || status === 503
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) throw err
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]))
    }
  }
}

export type ParsedTrip = {
  destination: string | null
  duration_days: number | null
  budget_inr: number | null
  travelers: number | null
}

const PARSE_TRIP_SYSTEM_PROMPT = `You extract trip details from a traveler's free-text message.
Return ONLY a JSON object, no other text, matching exactly this shape:
{"destination": string|null, "duration_days": number|null, "budget_inr": number|null, "travelers": number|null}
If a field isn't mentioned, use null. Do not guess or invent values. Budget should be a plain number in INR (convert "25K" to 25000).`

export async function parseTripMessage(message: string): Promise<ParsedTrip> {
  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PARSE_TRIP_SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
    })
  )

  const raw = response.choices[0]?.message?.content ?? '{}'

  try {
    return JSON.parse(raw)
  } catch {
    // Model didn't return clean JSON — fail safe rather than crash the UI.
    return { destination: null, duration_days: null, budget_inr: null, travelers: null }
  }
}

export type VoyagerProfile = {
  personality?: string // e.g. "Beach Potato"
  budget_style?: string // e.g. "Balanced Human"
  pace?: string // e.g. "Casual Stroller"
  diet?: string
}

// Prepends the saved profile to the system prompt so every downstream
// AI call is personalized — this is "feature 4" from the roadmap,
// and it's genuinely just string concatenation.
export async function getPersonalizedTip(
  destination: string,
  profile: VoyagerProfile
): Promise<string> {
  const profileLine = `This traveler is a ${profile.personality ?? 'flexible'} traveler with ${
    profile.budget_style ?? 'balanced'
  } budget habits, prefers a ${profile.pace ?? 'moderate'} pace${
    profile.diet ? `, and follows a ${profile.diet} diet` : ''
  }.`

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `${profileLine} Given a destination, give ONE short, specific, genuinely useful travel tip (max 25 words) that reflects this traveler's profile. No preamble, just the tip.`,
        },
        { role: 'user', content: destination },
      ],
    })
  )

  return response.choices[0]?.message?.content?.trim() ?? ''
}
