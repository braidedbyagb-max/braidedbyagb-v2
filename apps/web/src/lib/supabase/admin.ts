// Admin Supabase client — uses service_role key, bypasses RLS
// ONLY use in server-side API routes / server actions.
// NEVER import this in client components or expose to browser.
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
