import fs from "node:fs";
import https from "node:https";
import type { ReminderProvider, SendMessageInput, SendMessageResult } from "./types.ts";

const TOSS_API_HOST = "apps-in-toss-api.toss.im";
const SEND_MESSAGE_PATH = "/api-partner/v1/apps-in-toss/messenger/send-message";

interface TossPushProviderOptions {
  templateSetCode: string;
  certPath: string;
  keyPath: string;
}

interface SendMessageResponse {
  resultType?: string;
  result?: {
    detail?: {
      sentPush?: Array<{ contentId?: string }>;
    };
  };
  error?: { reason?: string; errorCode?: string };
}

export class TossPushProvider implements ReminderProvider {
  private readonly templateSetCode: string;
  private readonly agent: https.Agent;

  constructor(options: TossPushProviderOptions) {
    this.templateSetCode = options.templateSetCode;
    const cert = fs.readFileSync(options.certPath);
    const key = fs.readFileSync(options.keyPath);
    this.agent = new https.Agent({ cert, key, keepAlive: true });
  }

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    const payload = JSON.stringify({
      templateSetCode: this.templateSetCode,
      context: {},
    });

    try {
      const { statusCode, body } = await this.request(payload, input.userId);

      if (statusCode == null || statusCode < 200 || statusCode >= 300) {
        return { ok: false, errorReason: `toss_push_http_${statusCode ?? "unknown"}: ${body}` };
      }

      let data: SendMessageResponse;
      try {
        data = JSON.parse(body) as SendMessageResponse;
      } catch {
        return { ok: false, errorReason: `toss_push_invalid_json: ${body.slice(0, 200)}` };
      }

      if (data.resultType !== "SUCCESS") {
        const reason = data.error?.reason ?? data.error?.errorCode ?? data.resultType ?? "unknown";
        return { ok: false, errorReason: `toss_push_result_${reason}` };
      }
      const contentId = data.result?.detail?.sentPush?.[0]?.contentId ?? "";
      return { ok: true, providerMessageId: contentId };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown_error";
      return { ok: false, errorReason: `toss_push_error: ${message}` };
    }
  }

  private request(payload: string, tossUserKey: string): Promise<{ statusCode?: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          host: TOSS_API_HOST,
          path: SEND_MESSAGE_PATH,
          method: "POST",
          agent: this.agent,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            "X-Toss-User-Key": tossUserKey,
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => {
            resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks).toString("utf-8") });
          });
        },
      );
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
  }
}
