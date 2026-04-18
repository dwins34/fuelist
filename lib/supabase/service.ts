import { supabaseAdmin } from './admin'

/** Returns the service-role Supabase client (bypasses RLS). */
export function createServiceClient() {
  return supabaseAdmin
}
