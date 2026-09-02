import { createBrowserClient } from '@supabase/ssr'

// Used in 'use client' components — auth forms, chat UI, etc.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
