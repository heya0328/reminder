export type ReminderIntensity = "gentle" | "normal" | "strong";

export type ReminderStatus = "active" | "completed" | "disabled";

export interface Reminder {
  id: string;
  title: string;
  allowedStartHour: number;
  allowedEndHour: number;
  intensity: ReminderIntensity;
  randomness: number;
  status: ReminderStatus;
  snoozedUntil: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateReminderInput {
  tossUserKey: string;
  title: string;
  allowedStartHour: number;
  allowedEndHour: number;
  intensity: ReminderIntensity;
  randomness: number;
}
