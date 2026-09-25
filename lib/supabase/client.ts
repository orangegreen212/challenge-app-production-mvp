'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Singleton browser client. `createBrowserClient()` spins up its own
 * GoTrueClient, which acquires an exclusive Navigator LockManager lock
 * (`lock:sb-<ref>-auth-token`) on init to coordinate session refresh.
 * Calling the factory more than once produces multiple GoTrueClient
 * instances that race for that same lock, which Firefox surfaces as
 * "Acquiring an exclusive Navigator LockManager lock ... immediately
 * failed". Caching the instance module-wide guarantees exactly one
 * GoTrueClient exists per browser tab.
 */
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseKey);
  }
  return browserClient;
}
