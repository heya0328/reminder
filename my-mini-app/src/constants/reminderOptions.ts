import type { ReminderIntensity } from "../types/reminder";

export interface TimePreset {
  id: string;
  label: string;
  description: string;
  allowedStartHour: number;
  allowedEndHour: number;
}

export const TIME_PRESETS: TimePreset[] = [
  {
    id: "workday",
    label: "낮 시간",
    description: "오전 9시부터 오후 6시 사이",
    allowedStartHour: 9,
    allowedEndHour: 18,
  },
  {
    id: "evening",
    label: "저녁",
    description: "오후 6시부터 밤 10시 사이",
    allowedStartHour: 18,
    allowedEndHour: 22,
  },
  {
    id: "anytime",
    label: "깨어있는 시간",
    description: "오전 9시부터 밤 10시 사이",
    allowedStartHour: 9,
    allowedEndHour: 22,
  },
];

export const INTENSITY_LABELS: Record<ReminderIntensity, string> = {
  gentle: "가볍게",
  normal: "보통",
  strong: "강하게",
};

export const INTENSITY_DESCRIPTIONS: Record<ReminderIntensity, string> = {
  gentle: "가끔만 떠올려도 되는 일",
  normal: "잊으면 곤란한 생활 관리",
  strong: "이번 주 안에 꼭 끝낼 일",
};

export const INTENSITY_OPTIONS: ReminderIntensity[] = [
  "gentle",
  "normal",
  "strong",
];
