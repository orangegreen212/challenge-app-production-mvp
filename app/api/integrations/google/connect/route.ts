import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildGoogleAuthUrl } from '@/lib/integrations/google';

const STATE_COOKIE = 'google_oauth_state';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  const origin = request.nextUrl.origin;
  const state = crypto.randomUUID();

  let authUrl: string;
  try {
    authUrl = buildGoogleAuthUrl(origin, state);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google integration is not configured';
    const url = new URL('/settings', request.url);
    url.searchParams.set('integration_error', message);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });
  return response;
}
