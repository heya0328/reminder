export type ReminderIntensity = "gentle" | "normal" | "strong";
export type ReminderStatus = "active" | "completed" | "disabled";
export type Channel = "push" | "sms";
export type SendStatus = "sent" | "failed" | "skipped";
export type ReminderEventType = "created" | "completed" | "snoozed" | "sent" | "skipped";

export interface User {
  id: string;
  tossUserKey: string;
  phoneNumber: string | null;
  createdAt: string;
}

export interface NotificationConsent {
  userId: string;
  pushEnabled: boolean;
  smsEnabled: boolean;
  smsUnsubscribedAt: string | null;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  allowedStartHour: number;
  allowedEndHour: number;
  intensity: ReminderIntensity;
  status: ReminderStatus;
  snoozedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderWithUser extends Reminder {
  tossUserKey: string;
  phoneNumber: string | null;
  pushEnabled: boolean;
  smsEnabled: boolean;
  smsUnsubscribedAt: string | null;
}

export interface ReminderEvent {
  id: string;
  reminderId: string;
  userId: string;
  type: ReminderEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SendAttempt {
  id: string;
  reminderId: string;
  userId: string;
  channel: Channel;
  status: SendStatus;
  reason: string | null;
  providerMessageId: string | null;
  createdAt: string;
}
