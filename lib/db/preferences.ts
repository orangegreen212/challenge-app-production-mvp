import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserPreferencesRow {
  user_id: string;
  default_duration: number;
  default_intensity: string;
  daily_time_goal: number;
  daily_reminders: boolean;
  achievement_alerts: boolean;
  streak_warnings: boolean;
  reminder_time: string;
  timezone: string;
  google_reminder_event_id: string | null;
  last_telegram_reminder_date: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULTS: Omit<
  UserPreferencesRow,
  'user_id' | 'created_at' | 'updated_at' | 'google_reminder_event_id' | 'last_telegram_reminder_date'
> = {
  default_duration: 30,
  default_intensity: 'Balanced',
  daily_time_goal: 60,
  daily_reminders: true,
  achievement_alerts: true,
  streak_warnings: false,
  reminder_time: '09:00',
  timezone: 'UTC',
};

export async function getOrCreatePreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferencesRow> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as UserPreferencesRow;

  const { data: created, error: insertError } = await supabase
    .from('user_preferences')
    .insert({ user_id: userId, ...DEFAULTS })
    .select('*')
    .single();

  if (insertError) throw insertError;
  return created as UserPreferencesRow;
}

export async function updatePreferences(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<Omit<UserPreferencesRow, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferencesRow> {
  const { data, error } = await supabase
    .from('user_preferences')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data as UserPreferencesRow;
}
