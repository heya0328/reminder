import type { ReminderRepository } from "./repository.ts";
import type { Reminder, ReminderIntensity } from "./types.ts";

export interface CreateReminderPayload {
  tossUserKey: string;
  phoneNumber?: string;
  smsEnabled?: boolean;
  title: string;
  allowedStartHour: number;
  allowedEndHour: number;
  intensity: ReminderIntensity;
}

export function publicReminder(reminder: Reminder) {
  return {
    id: reminder.id,
    title: reminder.title,
    allowedStartHour: reminder.allowedStartHour,
    allowedEndHour: reminder.allowedEndHour,
    intensity: reminder.intensity,
    status: reminder.status,
    snoozedUntil: reminder.snoozedUntil,
    createdAt: reminder.createdAt,
    updatedAt: reminder.updatedAt,
  };
}

export function createReminder(repo: ReminderRepository, payload: CreateReminderPayload) {
  const user = repo.upsertUser({
    tossUserKey: payload.tossUserKey,
    phoneNumber: payload.phoneNumber,
  });
  repo.upsertConsent({
    userId: user.id,
    pushEnabled: true,
    smsEnabled: payload.smsEnabled ?? false,
    smsUnsubscribedAt: payload.smsEnabled ? null : undefined,
  });
  return repo.createReminder({
    userId: user.id,
    title: payload.title,
    allowedStartHour: payload.allowedStartHour,
    allowedEndHour: payload.allowedEndHour,
    intensity: payload.intensity,
  });
}
