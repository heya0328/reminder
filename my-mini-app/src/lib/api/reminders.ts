import type { CreateReminderInput, Reminder } from "../../types/reminder";
import { apiRequest } from "./client";

type ReminderListResponse = Reminder[] | { reminders: Reminder[] };
type ReminderResponse = Reminder | { reminder: Reminder };

function unwrapReminders(response: ReminderListResponse): Reminder[] {
  return Array.isArray(response) ? response : response.reminders;
}

function unwrapReminder(response: ReminderResponse): Reminder {
  return "reminder" in response ? response.reminder : response;
}

export async function createReminder(
  input: CreateReminderInput,
): Promise<Reminder> {
  const response = await apiRequest<ReminderResponse>("/api/reminders", {
    method: "POST",
    body: input,
  });
  return unwrapReminder(response);
}

export async function listReminders(tossUserKey: string): Promise<Reminder[]> {
  const params = new URLSearchParams({ tossUserKey });
  const response = await apiRequest<ReminderListResponse>(
    `/api/reminders?${params.toString()}`,
  );

  return unwrapReminders(response);
}

export async function completeReminder(id: string): Promise<Reminder> {
  const response = await apiRequest<ReminderResponse>(`/api/reminders/${id}/complete`, {
    method: "POST",
  });
  return unwrapReminder(response);
}

export async function snoozeReminder(id: string): Promise<Reminder> {
  const response = await apiRequest<ReminderResponse>(`/api/reminders/${id}/snooze`, {
    method: "POST",
  });
  return unwrapReminder(response);
}
