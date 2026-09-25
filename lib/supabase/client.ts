'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser client. Session is stored in cookies (not localStorage) so the
 * server (Route Handlers, middleware) can read the same session.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
