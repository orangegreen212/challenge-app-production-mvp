'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser client. Session is stored in cookies (not localStorage) so the
 * server (Route Handlers, middleware) can read the same session.
 *
 * Cached as a module-level singleton: createBrowserClient() spins up its
 * own GoTrueClient, which acquires an exclusive Navigator LockManager lock
 * (`lock:sb-<ref>-auth-token`) on init to coordinate session refresh across
 * tabs. Calling the factory more than once (e.g. from an un-memoized call
 * in a component body, or from a second call site) creates multiple
 * GoTrueClient instances that race for that same lock — Firefox surfaces
 * the losing, non-blocking acquisition attempt as an uncaught rejection:
 * "Acquiring an exclusive Navigator LockManager lock ... immediately
 * failed". Returning the same instance from every call site guarantees
 * exactly one GoTrueClient per browser tab.
 */
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseKey);
  }
  return browserClient;
}
