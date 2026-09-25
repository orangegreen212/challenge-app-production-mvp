import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchUserChallengesFromDb } from '@/lib/db/challenges';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const challenges = await fetchUserChallengesFromDb(supabase);
  return NextResponse.json({ challenges });
}
