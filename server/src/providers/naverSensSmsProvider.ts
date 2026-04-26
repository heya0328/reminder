import crypto from "node:crypto";
import type { ReminderProvider, SendMessageInput, SendMessageResult } from "./types.ts";

export interface NaverSensSmsProviderOptions {
  accessKey: string;
  secretKey: string;
  serviceId: string;
  fromNumber: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface NaverSensSendResponse {
  requestId?: string;
  statusCode?: string;
  statusName?: string;
  errorMessage?: string;
  message?: string;
}

export function createNaverSensSignature(input: { method: string; uri: string; timestamp: string; accessKey: string; secretKey: string }) {
  const message = `${input.method} ${input.uri}\n${input.timestamp}\n${input.accessKey}`;
  return crypto.createHmac("sha256", input.secretKey).update(message).digest("base64");
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function smsContent() {
  return "[랜덤 리마인더] 지금 확인할 일이 있어요. 앱에서 확인해 주세요.";
}

export class NaverSensSmsProvider implements ReminderProvider {
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly serviceId: string;
  private readonly fromNumber: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: NaverSensSmsProviderOptions) {
    this.accessKey = options.accessKey;
    this.secretKey = options.secretKey;
    this.serviceId = options.serviceId;
    this.fromNumber = digitsOnly(options.fromNumber);
    this.baseUrl = options.baseUrl ?? "https://sens.apigw.ntruss.com";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async send(input: SendMessageInput): Promise<SendMessageResult> {
    if (!input.phoneNumber) {
      return { ok: false, errorReason: "missing_phone_number" };
    }

    const method = "POST";
    const uri = `/sms/v2/services/${this.serviceId}/messages`;
    const timestamp = String(Date.now());
    const response = await this.fetchImpl(`${this.baseUrl}${uri}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": this.accessKey,
        "x-ncp-apigw-signature-v2": createNaverSensSignature({
          method,
          uri,
          timestamp,
          accessKey: this.accessKey,
          secretKey: this.secretKey,
        }),
      },
      body: JSON.stringify({
        type: "SMS",
        contentType: "COMM",
        countryCode: "82",
        from: this.fromNumber,
        content: smsContent(),
        messages: [
          {
            to: digitsOnly(input.phoneNumber),
          },
        ],
      }),
    });

    const body = await response.text();
    const payload = body ? (JSON.parse(body) as NaverSensSendResponse) : {};

    if (!response.ok || payload.statusName === "fail") {
      return {
        ok: false,
        errorReason: payload.errorMessage ?? payload.message ?? (payload.statusCode ? `naver_sens_${payload.statusCode}` : `naver_sens_http_${response.status}`),
      };
    }

    return {
      ok: true,
      providerMessageId: payload.requestId,
    };
  }
}
