# Voyagent — MVP scaffold

This is the Day 1 scaffold: project structure, auth (email/password via Supabase),
API routes, static dataset, and shared trip state — all wired and building cleanly.
No UI polish yet beyond login/signup — that's Day 2+.

## What's already done

- Next.js (App Router) + TypeScript + Tailwind, single deployable app (no separate backend)
- `lib/supabase-client.ts` / `lib/supabase-server.ts` — browser + server Supabase clients
- `lib/claude.ts` — `parseTripMessage()` and `getPersonalizedTip()`, server-only
- `middleware.ts` — protects all routes except `/`, `/login`, `/signup`; refreshes session
  - Note: Next.js 16 renamed this convention to `proxy.ts`. `middleware.ts` still works
    (you'll just see a deprecation warning in the build log) — rename later if you want,
    not worth the time now.
- `app/signup`, `app/login` — working email/password forms wired to Supabase Auth
- `app/api/parse-trip` — POST, calls Claude, returns `{destination, duration_days, budget_inr, travelers}`
- `app/api/personalize` — POST, returns one Claude-generated tip using the saved profile
- `app/api/flights`, `app/api/hotels` — GET, filter the static JSON datasets
- `app/api/profile` — GET/POST the Voyager's Profile (personality quiz answers)
- `app/api/payment/verify` — POST, verifies Razorpay signature, writes booking, returns fake PNR
- `data/flights.json`, `data/hotels.json` — starter curated dataset (5 entries each — expand to 20-30 on Day 3)
- `context/TripContext.tsx` — shared client state incl. `budgetBreakdown()` with GST logic already implemented
- `supabase/schema.sql` — run this once in the Supabase SQL editor before anything else

## Day 1 setup (do this first, ~30-45 min)

1. Create a free project at supabase.com
2. In the SQL editor, run `supabase/schema.sql`
3. In Authentication settings, **turn OFF "Confirm email"** — otherwise signup won't
   immediately log the user in, which will trip you up mid-demo
4. Copy `.env.local.example` to `.env.local` and fill in:
   - Supabase URL + anon key (Project Settings > API)
   - `ANTHROPIC_API_KEY` (console.anthropic.com)
   - Razorpay test-mode key id + secret (dashboard.razorpay.com, Test Mode toggle)
5. `npm install && npm run dev` — confirm signup → redirect to `/profile` works end to end

## Still to build (Day 2 onward)

- `/profile` — the 3-question personality quiz UI, POSTs to `/api/profile`
- `/chat` — the Voyagent chat UI, calls `/api/parse-trip`, shows the staged
  "Research Agent... Budget Agent..." loading animation over the one real Claude call
- `/results` — flight/hotel cards, reads from `/api/flights` + `/api/hotels`, uses
  `TripContext.budgetBreakdown()` for the running total
- Razorpay checkout.js integration on the payment step → calls `/api/payment/verify`
- `/itinerary` — pure display, assembles `TripContext` state + calls `/api/personalize`
  for the one personalization line
- Home screen with "My Bookings" (read from `bookings` table) — seed 2 fake completed
  trips per user so it's never empty on a fresh demo account
- Static pricing/tier screen — UI only, "Upgrade" button just shows a toast

## Explicitly cut from this MVP (per our scope discussion)

OTP/SMS auth, live weather, SOS/Desk tab, real subscription billing, live travel
partner APIs, train booking as a separate flow. These are "said, not built" —
covered in the presentation narrative, not the code.
