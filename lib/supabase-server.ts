import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Used inside API routes (app/api/**/route.ts) — reads the user's session
// from cookies so we know which user is making the request.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore if you
            // have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
