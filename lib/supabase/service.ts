import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely, so
 * it must NEVER be imported into client components or exposed to the
 * browser — `server-only` above makes an accidental client-side import a
 * build error.
 *
 * Only use this where there is no user session to authenticate with, and
 * the caller has already been verified some other way (e.g. the Telegram
 * webhook, verified via a shared secret header from Telegram).
 */
export function createServiceClient() {
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. It is required for server-only ' +
        'operations like the Telegram webhook that have no user session.'
    );
  }
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
