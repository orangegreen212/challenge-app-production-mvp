import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteIntegration } from '@/lib/db/integrations';

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await deleteIntegration(supabase, user.id, 'telegram');
  return NextResponse.json({ success: true });
}
