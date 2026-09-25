import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { setTaskCompletion } from '@/lib/db/challenges';

const patchSchema = z.object({
  completed: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!taskId || typeof taskId !== 'string') {
    return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // setTaskCompletion runs through the user-scoped Supabase client, so RLS
  // guarantees this can only succeed for a task the user owns. If the task
  // doesn't exist or belongs to someone else, the update matches 0 rows.
  const ok = await setTaskCompletion(supabase, taskId, parsed.data.completed);
  if (!ok) {
    return NextResponse.json(
      { error: 'Task not found or you do not have access to it' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
