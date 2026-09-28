import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchChallengeByIdFromDb, deleteChallengeById } from '@/lib/db/challenges';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const challenge = await fetchChallengeByIdFromDb(supabase, id);
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  return NextResponse.json({ challenge });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ok = await deleteChallengeById(supabase, id);
  if (!ok) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
