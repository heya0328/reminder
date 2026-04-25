import type { CreateReminderInput, Reminder } from "../../types/reminder";
import { apiRequest } from "./client";

type ReminderListResponse = Reminder[] | { reminders: Reminder[] };

function unwrapReminders(response: ReminderListResponse): Reminder[] {
  return Array.isArray(response) ? response : response.reminders;
}

export async function createReminder(
  input: CreateReminderInput,
): Promise<Reminder> {
  return apiRequest<Reminder>("/api/reminders", {
    method: "POST",
    body: input,
  });
}

export async function listReminders(tossUserKey: string): Promise<Reminder[]> {
  const params = new URLSearchParams({ tossUserKey });
  const response = await apiRequest<ReminderListResponse>(
    `/api/reminders?${params.toString()}`,
  );

  return unwrapReminders(response);
}

export async function completeReminder(id: string): Promise<Reminder> {
  return apiRequest<Reminder>(`/api/reminders/${id}/complete`, {
    method: "POST",
  });
}

export async function snoozeReminder(id: string): Promise<Reminder> {
  return apiRequest<Reminder>(`/api/reminders/${id}/snooze`, {
    method: "POST",
  });
}
