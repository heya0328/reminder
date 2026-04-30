import { supabaseGet, supabasePatch } from "./supabase";

interface SupabaseConsent {
  user_id: string;
  push_enabled: boolean;
  push_consented_at: string | null;
}

interface SupabaseUser {
  id: string;
}

export interface ConsentState {
  pushEnabled: boolean;
  pushConsentedAt: string | null;
}

async function findUserId(tossUserKey: string): Promise<string | null> {
  const users = await supabaseGet<SupabaseUser[]>(
    "users",
    `toss_user_key=eq.${encodeURIComponent(tossUserKey)}&select=id`,
  );
  return users[0]?.id ?? null;
}

export async function getConsent(tossUserKey: string): Promise<ConsentState | null> {
  const userId = await findUserId(tossUserKey);
  if (!userId) return null;

  const rows = await supabaseGet<SupabaseConsent[]>(
    "notification_consents",
    `user_id=eq.${encodeURIComponent(userId)}&select=push_enabled,push_consented_at`,
  );
  const row = rows[0];
  if (!row) return null;
  return { pushEnabled: row.push_enabled, pushConsentedAt: row.push_consented_at };
}

export async function recordPushConsent(tossUserKey: string): Promise<ConsentState> {
  const userId = await findUserId(tossUserKey);
  if (!userId) throw new Error("동의를 저장할 사용자 정보가 없어요.");

  const now = new Date().toISOString();
  const rows = await supabasePatch<SupabaseConsent[]>(
    "notification_consents",
    `user_id=eq.${encodeURIComponent(userId)}`,
    {
      push_enabled: true,
      push_consented_at: now,
      updated_at: now,
    },
  );
  const row = rows[0];
  if (!row) throw new Error("동의 정보를 찾을 수 없어요. 잠시 후 다시 시도해 주세요.");
  return { pushEnabled: row.push_enabled, pushConsentedAt: row.push_consented_at };
}
