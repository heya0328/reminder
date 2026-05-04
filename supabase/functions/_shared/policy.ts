const TIME_ZONE = "Asia/Seoul";

export type ReminderIntensity = "gentle" | "normal" | "strong";

export function maxDailySendsForIntensity(intensity: ReminderIntensity): number {
  if (intensity === "gentle") return 1;
  if (intensity === "normal") return 2;
  return 3;
}

export function spreadDaysForRandomness(randomness: number): number {
  if (randomness <= 0) return 1;
  if (randomness <= 25) return 2;
  if (randomness <= 50) return 3;
  if (randomness <= 75) return 4;
  return 5;
}

export function hourInSeoul(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "2-digit", hour12: false }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  return hour === 24 ? 0 : hour;
}

export function dayInSeoul(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function isNightRestricted(date: Date): boolean {
  const hour = hourInSeoul(date);
  return hour >= 21 || hour < 9;
}

export function isInsideAllowedWindow(hour: number, startHour: number, endHour: number): boolean {
  if (startHour === endHour) return true;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

export async function seededRandomInt(seed: string, minInclusive: number, maxExclusive: number): Promise<number> {
  if (maxExclusive <= minInclusive) throw new Error("maxExclusive must be greater than minInclusive");
  const data = new TextEncoder().encode(seed);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const view = new DataView(hashBuffer);
  const value = view.getUint32(0) / 0xffffffff;
  return Math.floor(value * (maxExclusive - minInclusive)) + minInclusive;
}

export interface ReminderForSchedule {
  id: string;
  randomness: number | null;
  intensity: ReminderIntensity;
  allowedStartHour: number;
  allowedEndHour: number;
  snoozedUntil: string | null;
  createdAt: string;
}

export interface ScheduleDecision {
  ok: boolean;
  reason: string;
}

export async function shouldConsiderReminderNow(input: {
  reminder: ReminderForSchedule;
  now: Date;
  sentToday: number;
}): Promise<ScheduleDecision> {
  const { reminder, now, sentToday } = input;
  if (reminder.snoozedUntil && new Date(reminder.snoozedUntil) > now) return { ok: false, reason: "snoozed" };
  if (isNightRestricted(now)) return { ok: false, reason: "night_restricted" };
  const hour = hourInSeoul(now);
  if (!isInsideAllowedWindow(hour, reminder.allowedStartHour, reminder.allowedEndHour)) return { ok: false, reason: "outside_allowed_window" };
  const maxDailySends = maxDailySendsForIntensity(reminder.intensity);
  if (sentToday >= maxDailySends) return { ok: false, reason: "daily_cap_reached" };

  const spreadDays = spreadDaysForRandomness(reminder.randomness ?? 50);
  if (spreadDays > 1) {
    const createdDay = reminder.createdAt.slice(0, 10);
    const todayStr = dayInSeoul(now);
    const daysSinceCreated = Math.floor((new Date(todayStr).getTime() - new Date(createdDay).getTime()) / (24 * 60 * 60 * 1000));
    const cycleDayIndex = daysSinceCreated % spreadDays;
    const candidateDay = await seededRandomInt(`${reminder.id}:day:${Math.floor(daysSinceCreated / spreadDays)}`, 0, spreadDays);
    if (cycleDayIndex !== candidateDay) return { ok: false, reason: "not_candidate_day" };
  }

  const candidateHour = await seededRandomInt(`${reminder.id}:${dayInSeoul(now)}:${sentToday}`, reminder.allowedStartHour, reminder.allowedEndHour);
  if (hour !== candidateHour) return { ok: false, reason: "not_candidate_hour" };
  return { ok: true, reason: "candidate_hour" };
}
