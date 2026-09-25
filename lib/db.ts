import { createClient } from './supabase/client';
import type { Achievement } from './types';

/**
 * Achievements are shared, seeded definitions (see migrations) with a
 * per-user unlock table. This is the one piece of the original db.ts that
 * still matches the current schema, so it's kept as-is; everything else
 * (challenge/day/task CRUD) now lives in lib/db/challenges.ts and is
 * called from the server (API routes), not directly from the client.
 */
export async function fetchAchievements(): Promise<Achievement[]> {
  const supabase = createClient();

  const { data: achievements, error: achError } = await supabase
    .from('achievements')
    .select('*');

  if (achError || !achievements) return [];

  const { data: userAchs } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at');

  const unlockedMap = new Map<string, string>();
  for (const ua of (userAchs || []) as Array<{ achievement_id: string; unlocked_at: string }>) {
    unlockedMap.set(ua.achievement_id, ua.unlocked_at);
  }

  return (achievements as Array<{ id: string; title: string; description: string; icon: string }>).map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    icon: a.icon,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id),
  }));
}
