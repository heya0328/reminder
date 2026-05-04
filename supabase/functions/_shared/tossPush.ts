const TOSS_API_URL = "https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/messenger/send-message";

export interface TossPushResult {
  ok: boolean;
  providerMessageId?: string;
  errorReason?: string;
}

export async function callTossPush(input: {
  tossUserKey: string;
  templateSetCode: string;
  client: Deno.HttpClient;
}): Promise<TossPushResult> {
  try {
    const res = await fetch(TOSS_API_URL, {
      method: "POST",
      // @ts-expect-error: Deno fetch supports `client` for mTLS
      client: input.client,
      headers: {
        "Content-Type": "application/json",
        "X-Toss-User-Key": input.tossUserKey,
      },
      body: JSON.stringify({ templateSetCode: input.templateSetCode, context: {} }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, errorReason: `toss_push_http_${res.status}: ${text.slice(0, 300)}` };
    let data: Record<string, unknown> & { resultType?: string; result?: { detail?: { sentPush?: Array<{ contentId?: string }> } }; error?: { reason?: string; errorCode?: string } };
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, errorReason: `toss_push_invalid_json: ${text.slice(0, 200)}` };
    }
    if (data.resultType !== "SUCCESS") {
      const reason = data.error?.reason ?? data.error?.errorCode ?? data.resultType ?? "unknown";
      return { ok: false, errorReason: `toss_push_result_${reason}` };
    }
    return { ok: true, providerMessageId: data.result?.detail?.sentPush?.[0]?.contentId ?? "" };
  } catch (err) {
    return { ok: false, errorReason: `toss_push_error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export function createTossHttpClient(): Deno.HttpClient {
  const cert = Deno.env.get("TOSS_MTLS_CERT");
  const key = Deno.env.get("TOSS_MTLS_KEY");
  if (!cert || !key) throw new Error("TOSS_MTLS_CERT and TOSS_MTLS_KEY must be set");
  return Deno.createHttpClient({ cert, key });
}
