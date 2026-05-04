// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createTossHttpClient } from "../_shared/tossPush.ts";

const TOSS_TOKEN_URL = "https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/generate-token";
const TOSS_ME_URL = "https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/login-me";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS_HEADERS } });
}

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse(405, { error: "method_not_allowed" });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }
  const authorizationCode = body?.authorizationCode;
  const referrer = body?.referrer;
  if (typeof authorizationCode !== "string" || typeof referrer !== "string") {
    return jsonResponse(400, { error: "invalid_login_input", message: "authorizationCode와 referrer가 필요해요." });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  async function ensureUserAndConsent(tossUserKey: string): Promise<void> {
    const { data: existing } = await supabase.from("users").select("id").eq("toss_user_key", tossUserKey).limit(1);
    let userId: string | undefined = existing?.[0]?.id;
    const nowIso = new Date().toISOString();
    if (!userId) {
      userId = `user_${crypto.randomUUID()}`;
      await supabase.from("users").insert({ id: userId, toss_user_key: tossUserKey, created_at: nowIso });
    }
    const { data: existingConsent } = await supabase.from("notification_consents").select("user_id").eq("user_id", userId).limit(1);
    if (!existingConsent?.[0]) {
      await supabase.from("notification_consents").insert({
        user_id: userId,
        push_enabled: false,
        push_consented_at: null,
        sms_enabled: false,
        sms_unsubscribed_at: null,
        updated_at: nowIso,
      });
    }
  }

  // Local dev mock path retained
  if (referrer === "SANDBOX" && authorizationCode === "local-dev-auth-code") {
    const tossUserKey = "local-dev-user";
    await ensureUserAndConsent(tossUserKey);
    return jsonResponse(200, { userKey: tossUserKey, accessToken: "local-dev-token" });
  }

  const httpClient = createTossHttpClient();
  try {
    const tokenRes = await fetch(TOSS_TOKEN_URL, {
      method: "POST",
      // @ts-expect-error: Deno fetch supports `client` for mTLS
      client: httpClient,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorizationCode, referrer }),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => "");
      return jsonResponse(401, { error: "token_exchange_failed", message: `토큰 발급에 실패했어요. (${tokenRes.status}) ${errText.slice(0, 200)}` });
    }
    const tokenEnvelope = (await tokenRes.json()) as { resultType?: string; success?: { accessToken?: string; refreshToken?: string }; error?: { reason?: string; errorCode?: string } };
    if (tokenEnvelope.resultType !== "SUCCESS" || !tokenEnvelope.success?.accessToken) {
      const reason = tokenEnvelope.error?.reason ?? tokenEnvelope.error?.errorCode ?? "unknown";
      return jsonResponse(401, { error: "token_exchange_failed", message: `토큰 발급 실패: ${reason}` });
    }
    const accessToken = tokenEnvelope.success.accessToken;

    const meRes = await fetch(TOSS_ME_URL, {
      // @ts-expect-error: Deno fetch supports `client` for mTLS
      client: httpClient,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) {
      const errText = await meRes.text().catch(() => "");
      return jsonResponse(401, { error: "user_info_failed", message: `사용자 정보를 가져올 수 없어요. (${meRes.status}) ${errText.slice(0, 200)}` });
    }
    const meEnvelope = (await meRes.json()) as { resultType?: string; success?: { userKey?: number | string }; error?: { reason?: string; errorCode?: string } };
    if (meEnvelope.resultType !== "SUCCESS" || meEnvelope.success?.userKey == null) {
      const reason = meEnvelope.error?.reason ?? meEnvelope.error?.errorCode ?? "no_user_key";
      return jsonResponse(401, { error: "user_info_failed", message: `사용자 정보 실패: ${reason}` });
    }
    const tossUserKey = String(meEnvelope.success.userKey);
    await ensureUserAndConsent(tossUserKey);
    return jsonResponse(200, { userKey: tossUserKey, accessToken });
  } catch (err: any) {
    return jsonResponse(500, { error: "login_error", message: err?.message ?? "로그인 중 오류가 발생했어요." });
  } finally {
    httpClient.close();
  }
});
