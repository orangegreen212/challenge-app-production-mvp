import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getIntegration, deleteIntegration } from '@/lib/db/integrations';
import { revokeGoogleToken } from '@/lib/integrations/google';

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const existing = await getIntegration(supabase, user.id, 'google_calendar');
  if (existing?.access_token) {
    await revokeGoogleToken(existing.access_token);
  }

  await deleteIntegration(supabase, user.id, 'google_calendar');
  return NextResponse.json({ success: true });
}
