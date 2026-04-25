import type { ReminderRepository } from "../reminders/repository.ts";

export function updateSmsConsent(
  repo: ReminderRepository,
  input: { tossUserKey: string; phoneNumber?: string; smsEnabled: boolean },
) {
  const user = repo.upsertUser({
    tossUserKey: input.tossUserKey,
    phoneNumber: input.phoneNumber,
  });
  return repo.upsertConsent({
    userId: user.id,
    smsEnabled: input.smsEnabled,
    smsUnsubscribedAt: input.smsEnabled ? null : undefined,
  });
}

export function unsubscribeSms(repo: ReminderRepository, tossUserKey: string) {
  const user = repo.findUserByTossUserKey(tossUserKey);
  if (!user) {
    return null;
  }
  return repo.upsertConsent({
    userId: user.id,
    smsEnabled: false,
    smsUnsubscribedAt: new Date().toISOString(),
  });
}
