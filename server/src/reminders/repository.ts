import crypto from "node:crypto";
import type { ReminderStore } from "../db/client.ts";
import type {
  Channel,
  NotificationConsent,
  Reminder,
  ReminderEvent,
  ReminderEventType,
  ReminderIntensity,
  ReminderStatus,
  ReminderWithUser,
  SendAttempt,
  SendStatus,
  User,
} from "./types.ts";

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export class ReminderRepository {
  private readonly store: ReminderStore;

  constructor(store: ReminderStore) {
    this.store = store;
  }

  upsertUser(input: { tossUserKey: string; phoneNumber?: string | null }): User {
    const existing = this.store.data.users.find((user) => user.tossUserKey === input.tossUserKey);
    if (existing) {
      if (input.phoneNumber != null) {
        existing.phoneNumber = input.phoneNumber;
        this.store.persist();
      }
      return existing;
    }

    const user: User = {
      id: id("user"),
      tossUserKey: input.tossUserKey,
      phoneNumber: input.phoneNumber ?? null,
      createdAt: nowIso(),
    };
    this.store.data.users.push(user);
    this.store.persist();
    return user;
  }

  findUserByTossUserKey(tossUserKey: string): User | null {
    return this.store.data.users.find((user) => user.tossUserKey === tossUserKey) ?? null;
  }

  upsertConsent(input: { userId: string; pushEnabled?: boolean; smsEnabled?: boolean; smsUnsubscribedAt?: string | null }): NotificationConsent {
    const existing = this.getConsent(input.userId);
    if (existing) {
      existing.pushEnabled = input.pushEnabled ?? existing.pushEnabled;
      existing.smsEnabled = input.smsEnabled ?? existing.smsEnabled;
      existing.smsUnsubscribedAt = input.smsUnsubscribedAt === undefined ? existing.smsUnsubscribedAt : input.smsUnsubscribedAt;
      existing.updatedAt = nowIso();
      this.store.persist();
      return existing;
    }

    const consent: NotificationConsent = {
      userId: input.userId,
      pushEnabled: input.pushEnabled ?? true,
      smsEnabled: input.smsEnabled ?? false,
      smsUnsubscribedAt: input.smsUnsubscribedAt ?? null,
      updatedAt: nowIso(),
    };
    this.store.data.consents.push(consent);
    this.store.persist();
    return consent;
  }

  getConsent(userId: string): NotificationConsent | null {
    return this.store.data.consents.find((consent) => consent.userId === userId) ?? null;
  }

  createReminder(input: {
    userId: string;
    title: string;
    allowedStartHour: number;
    allowedEndHour: number;
    intensity: ReminderIntensity;
  }): Reminder {
    const createdAt = nowIso();
    const reminder: Reminder = {
      id: id("rem"),
      userId: input.userId,
      title: input.title,
      allowedStartHour: input.allowedStartHour,
      allowedEndHour: input.allowedEndHour,
      intensity: input.intensity,
      status: "active",
      snoozedUntil: null,
      createdAt,
      updatedAt: createdAt,
    };
    this.store.data.reminders.push(reminder);
    this.addEvent({ reminderId: reminder.id, userId: reminder.userId, type: "created", metadata: {}, createdAt });
    this.store.persist();
    return reminder;
  }

  getReminder(id: string): Reminder | null {
    return this.store.data.reminders.find((reminder) => reminder.id === id) ?? null;
  }

  listActiveReminders(userId: string): Reminder[] {
    return this.store.data.reminders
      .filter((reminder) => reminder.userId === userId && reminder.status === "active")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listActiveRemindersWithUsers(): ReminderWithUser[] {
    return this.store.data.reminders
      .filter((reminder) => reminder.status === "active")
      .map((reminder) => {
        const user = this.store.data.users.find((candidate) => candidate.id === reminder.userId);
        const consent = this.getConsent(reminder.userId);
        return {
          ...reminder,
          tossUserKey: user?.tossUserKey ?? "",
          phoneNumber: user?.phoneNumber ?? null,
          pushEnabled: consent?.pushEnabled ?? true,
          smsEnabled: consent?.smsEnabled ?? false,
          smsUnsubscribedAt: consent?.smsUnsubscribedAt ?? null,
        };
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  listRemindersForTossUserKey(tossUserKey: string): Reminder[] {
    const user = this.findUserByTossUserKey(tossUserKey);
    if (!user) return [];
    return this.store.data.reminders
      .filter((reminder) => reminder.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  updateReminder(id: string, input: { title?: string; intensity?: ReminderIntensity }): Reminder | null {
    const reminder = this.getReminder(id);
    if (!reminder) return null;
    if (input.title != null) reminder.title = input.title;
    if (input.intensity != null) reminder.intensity = input.intensity;
    reminder.updatedAt = nowIso();
    this.store.persist();
    return reminder;
  }

  updateReminderStatus(id: string, status: ReminderStatus): Reminder | null {
    const reminder = this.getReminder(id);
    if (!reminder) return null;
    reminder.status = status;
    reminder.updatedAt = nowIso();
    if (status === "completed") {
      this.addEvent({ reminderId: reminder.id, userId: reminder.userId, type: "completed", metadata: {} });
    }
    this.store.persist();
    return reminder;
  }

  snoozeReminder(id: string, snoozedUntil: string): Reminder | null {
    const reminder = this.getReminder(id);
    if (!reminder) return null;
    reminder.snoozedUntil = snoozedUntil;
    reminder.updatedAt = nowIso();
    this.addEvent({ reminderId: reminder.id, userId: reminder.userId, type: "snoozed", metadata: { snoozedUntil } });
    this.store.persist();
    return reminder;
  }

  unsnoozeReminder(id: string): Reminder | null {
    const reminder = this.getReminder(id);
    if (!reminder) return null;
    reminder.snoozedUntil = null;
    reminder.updatedAt = nowIso();
    this.addEvent({ reminderId: reminder.id, userId: reminder.userId, type: "unsnoozed", metadata: {} });
    this.store.persist();
    return reminder;
  }

  addSendAttempt(input: {
    reminderId: string;
    userId: string;
    channel: Channel;
    status: SendStatus;
    reason?: string | null;
    providerMessageId?: string | null;
    createdAt?: string;
  }): SendAttempt {
    const attempt: SendAttempt = {
      id: id("send"),
      reminderId: input.reminderId,
      userId: input.userId,
      channel: input.channel,
      status: input.status,
      reason: input.reason ?? null,
      providerMessageId: input.providerMessageId ?? null,
      createdAt: input.createdAt ?? nowIso(),
    };
    this.store.data.attempts.push(attempt);
    this.store.persist();
    return attempt;
  }

  addEvent(input: { reminderId: string; userId: string; type: ReminderEventType; metadata: Record<string, unknown>; createdAt?: string }): ReminderEvent {
    const event: ReminderEvent = {
      id: id("event"),
      reminderId: input.reminderId,
      userId: input.userId,
      type: input.type,
      metadata: input.metadata,
      createdAt: input.createdAt ?? nowIso(),
    };
    this.store.data.events.push(event);
    this.store.persist();
    return event;
  }

  countSendAttemptsForReminderOnDay(reminderId: string, date: Date, timeZone = "Asia/Seoul"): number {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    return this.store.data.attempts.filter((attempt) => attempt.reminderId === reminderId && attempt.status === "sent" && attempt.createdAt.slice(0, 10) === day).length;
  }

  countSmsAttemptsForUserOnDay(userId: string, date: Date, timeZone = "Asia/Seoul"): number {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    return this.store.data.attempts.filter((attempt) => attempt.userId === userId && attempt.channel === "sms" && attempt.status === "sent" && attempt.createdAt.slice(0, 10) === day).length;
  }

  listInboxForTossUserKey(tossUserKey: string): { attempts: SendAttempt[]; events: ReminderEvent[] } {
    const user = this.findUserByTossUserKey(tossUserKey);
    if (!user) return { attempts: [], events: [] };
    return {
      attempts: this.store.data.attempts.filter((attempt) => attempt.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      events: this.store.data.events.filter((event) => event.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }
}
