export type ReminderIntensity = "gentle" | "normal" | "strong";

export type ReminderStatus = "active" | "completed" | "disabled";

export interface Reminder {
  id: string;
  title: string;
  allowedStartHour: number;
  allowedEndHour: number;
  intensity: ReminderIntensity;
  status: ReminderStatus;
  snoozedUntil: string | null;
  createdAt: string;
}

export interface CreateReminderInput {
  tossUserKey: string;
  phoneNumber?: string;
  smsEnabled: boolean;
  title: string;
  allowedStartHour: number;
  allowedEndHour: number;
  intensity: ReminderIntensity;
}
