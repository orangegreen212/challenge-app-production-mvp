import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export type IntegrationProvider = 'google_calendar' | 'telegram';

export interface IntegrationRow {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  external_account: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function getIntegration(
  supabase: SupabaseClient,
  userId: string,
  provider: IntegrationProvider
): Promise<IntegrationRow | null> {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  if (error) throw error;
  return data as IntegrationRow | null;
}

export async function upsertIntegration(
  supabase: SupabaseClient,
  row: {
    user_id: string;
    provider: IntegrationProvider;
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: string | null;
    external_account?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await supabase
    .from('user_integrations')
    .upsert(row, { onConflict: 'user_id,provider' });

  if (error) throw error;
}

export async function deleteIntegration(
  supabase: SupabaseClient,
  userId: string,
  provider: IntegrationProvider
) {
  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) throw error;
}
