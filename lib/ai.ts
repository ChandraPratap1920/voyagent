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

// gemini-flash-latest is Google's evergreen alias — it always points at
// whatever Flash model is currently recommended, so it won't suddenly
// 404 the way a dated model name can when Google deprecates it.
const MODEL = 'gemini-flash-latest'

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
  const response = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PARSE_TRIP_SYSTEM_PROMPT },
      { role: 'user', content: message },
    ],
  })

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

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `${profileLine} Given a destination, give ONE short, specific, genuinely useful travel tip (max 25 words) that reflects this traveler's profile. No preamble, just the tip.`,
      },
      { role: 'user', content: destination },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? ''
}
