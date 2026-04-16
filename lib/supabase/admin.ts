/**
 * lib/supabase/admin.ts
 *
 * Singleton Supabase admin client (service-role key).
 * Import this instead of calling createAdminClient() in every route file.
 * Node module caching ensures only one instance is created per process.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

export const supabaseAdmin = createClient(url, key, {
  auth: {
    // Service role never needs session management
    persistSession: false,
    autoRefreshToken: false,
  },
})
