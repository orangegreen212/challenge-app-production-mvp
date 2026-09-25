import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Supabase redirects here after Google OAuth with a `code` query param.
// We exchange it for a session, which is stored in cookies by the server
// client, then send the user on to the dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
}
