import { LogPushProvider } from "./logPushProvider.ts";
import { TossPushProvider } from "./tossPushProvider.ts";
import type { ReminderProvider } from "./types.ts";

export function createPushProvider(): ReminderProvider {
  const provider = process.env.PUSH_PROVIDER ?? "log";

  if (provider === "toss") {
    const templateSetCode = process.env.TOSS_PUSH_TEMPLATE_SET_CODE;
    const certPath = process.env.TOSS_MTLS_CERT_PATH;
    const keyPath = process.env.TOSS_MTLS_KEY_PATH;
    if (!templateSetCode) {
      throw new Error("TOSS_PUSH_TEMPLATE_SET_CODE is required when PUSH_PROVIDER=toss");
    }
    if (!certPath || !keyPath) {
      throw new Error("TOSS_MTLS_CERT_PATH and TOSS_MTLS_KEY_PATH are required when PUSH_PROVIDER=toss");
    }
    return new TossPushProvider({ templateSetCode, certPath, keyPath });
  }

  return new LogPushProvider();
}
