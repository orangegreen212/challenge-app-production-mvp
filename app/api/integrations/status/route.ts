import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getIntegration } from '@/lib/db/integrations';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const [google, telegram] = await Promise.all([
    getIntegration(supabase, user.id, 'google_calendar'),
    getIntegration(supabase, user.id, 'telegram'),
  ]);

  return NextResponse.json({
    google: {
      connected: !!google,
      account: google?.external_account ?? null,
    },
    telegram: {
      connected: !!telegram,
      account: telegram?.external_account ?? null,
    },
  });
}
