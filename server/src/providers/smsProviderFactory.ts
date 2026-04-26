import { LogSmsProvider } from "./logSmsProvider.ts";
import { NaverSensSmsProvider } from "./naverSensSmsProvider.ts";
import type { ReminderProvider } from "./types.ts";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required when SMS_PROVIDER=naver-sens`);
  }
  return value;
}

export function createSmsProvider(): ReminderProvider {
  if (process.env.SMS_PROVIDER !== "naver-sens") {
    return new LogSmsProvider();
  }

  return new NaverSensSmsProvider({
    accessKey: requireEnv("NAVER_SENS_ACCESS_KEY"),
    secretKey: requireEnv("NAVER_SENS_SECRET_KEY"),
    serviceId: requireEnv("NAVER_SENS_SERVICE_ID"),
    fromNumber: requireEnv("NAVER_SENS_FROM_NUMBER"),
  });
}
