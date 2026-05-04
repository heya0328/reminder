import type { ReminderIntensity } from "../reminders/types.ts";

const TIME_ZONE = "Asia/Seoul";

export function maxDailySendsForIntensity(intensity: ReminderIntensity) {
  if (intensity === "gentle") return 1;
  if (intensity === "normal") return 2;
  return 3;
}

/**
 * randomness(0~100) → 발송 기간(일수)
 * 0 → 1일(오늘), 25 → 2일, 50 → 3일, 75 → 4일, 100 → 5일
 */
export function spreadDaysForRandomness(randomness: number): number {
  if (randomness <= 0) return 1;
  if (randomness <= 25) return 2;
  if (randomness <= 50) return 3;
  if (randomness <= 75) return 4;
  return 5;
}

export function hourInSeoul(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  return hour === 24 ? 0 : hour;
}

export function dayInSeoul(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isNightRestricted(date: Date) {
  const hour = hourInSeoul(date);
  return hour >= 21 || hour < 9;
}

export function isInsideAllowedWindow(hour: number, startHour: number, endHour: number) {
  if (startHour === endHour) return true;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}
