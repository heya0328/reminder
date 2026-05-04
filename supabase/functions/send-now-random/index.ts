// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOSS_API_BASE = "https://apps-in-toss-api.toss.im";
const TOSS_SEND_PATH = "/api-partner/v1/apps-in-toss/messenger/send-message";
const TOSS_SEND_TEST_PATH = "/api-partner/v1/apps-in-toss/messenger/send-test-message";

interface ReminderRow {
  id: string;
  user_id: string;
  title: string;
  status: string;
}

interface UserRow {
  id: string;
  toss_user_key: string;
}

interface ConsentRow {
  user_id: string;
  push_enabled: boolean;
}

interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  errorReason?: string;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function callTossPush(tossUserKey: string, templateSetCode: string, client: Deno.HttpClient, deploymentId?: string): Promise<SendResult> {
  try {
    const path = deploymentId ? TOSS_SEND_TEST_PATH : TOSS_SEND_PATH;
    const payload: Record<string, unknown> = { templateSetCode, context: {} };
    if (deploymentId) payload.deploymentId = deploymentId;
    const res = await fetch(`${TOSS_API_BASE}${path}`, {
      method: "POST",
      // @ts-expect-error: Deno fetch supports `client` for mTLS
      client,
      headers: {
        "Content-Type": "application/json",
        "X-Toss-User-Key": tossUserKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, errorReason: `toss_push_http_${res.status}: ${text.slice(0, 300)}` };
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, errorReason: `toss_push_invalid_json: ${text.slice(0, 200)}` };
    }
    if (data.resultType !== "SUCCESS") {
      const reason = data?.error?.reason ?? data?.error?.errorCode ?? data?.resultType ?? "unknown";
      return { ok: false, errorReason: `toss_push_result_${reason}` };
    }
    return { ok: true, providerMessageId: data?.result?.detail?.sentPush?.[0]?.contentId ?? "" };
  } catch (err) {
    return { ok: false, errorReason: `toss_push_error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(405, { error: "method_not_allowed" });

  const expectedSecret = Deno.env.get("BATCH_SECRET");
  const providedSecret = req.headers.get("x-batch-secret") ?? "";
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return jsonResponse(401, { error: "unauthorized" });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }
  const tossUserKey = typeof body?.tossUserKey === "string" ? body.tossUserKey : null;
  if (!tossUserKey) return jsonResponse(400, { error: "missing_toss_user_key" });
  const deploymentId = typeof body?.deploymentId === "string" && body.deploymentId.length > 0 ? body.deploymentId : undefined;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: users, error: userErr } = await supabase
    .from("users")
    .select("id, toss_user_key")
    .eq("toss_user_key", tossUserKey)
    .limit(1);
  if (userErr) return jsonResponse(500, { error: "db_user_error", detail: userErr.message });
  const user = (users?.[0] as UserRow | undefined);
  if (!user) return jsonResponse(400, { ok: false, reason: "user_not_found" });

  const { data: consents } = await supabase
    .from("notification_consents")
    .select("user_id, push_enabled")
    .eq("user_id", user.id)
    .limit(1);
  const consent = (consents?.[0] as ConsentRow | undefined);
  if (!consent?.push_enabled) return jsonResponse(400, { ok: false, reason: "push_not_enabled" });

  const { data: reminders, error: remErr } = await supabase
    .from("reminders")
    .select("id, user_id, title, status")
    .eq("user_id", user.id)
    .eq("status", "active");
  if (remErr) return jsonResponse(500, { error: "db_reminder_error", detail: remErr.message });
  const candidates = (reminders ?? []) as ReminderRow[];
  if (candidates.length === 0) return jsonResponse(400, { ok: false, reason: "no_active_reminders" });

  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  const cert = Deno.env.get("TOSS_MTLS_CERT")!;
  const key = Deno.env.get("TOSS_MTLS_KEY")!;
  const templateSetCode = Deno.env.get("TOSS_PUSH_TEMPLATE_SET_CODE")!;

  const httpClient = Deno.createHttpClient({ cert, key });

  let result: SendResult;
  try {
    result = await callTossPush(tossUserKey, templateSetCode, httpClient, deploymentId);
  } finally {
    httpClient.close();
  }

  const nowIso = new Date().toISOString();
  const attemptId = `send_${crypto.randomUUID()}`;
  const eventId = `event_${crypto.randomUUID()}`;

  await supabase.from("send_attempts").insert({
    id: attemptId,
    reminder_id: picked.id,
    user_id: user.id,
    channel: "push",
    status: result.ok ? "sent" : "failed",
    reason: result.ok ? "manual_send_now_random" : (result.errorReason ?? "push_failed"),
    provider_message_id: result.providerMessageId ?? null,
    created_at: nowIso,
  });
  await supabase.from("reminder_events").insert({
    id: eventId,
    reminder_id: picked.id,
    user_id: user.id,
    type: result.ok ? "sent" : "skipped",
    metadata_json: { channel: "push", sendAttemptId: attemptId, trigger: "manual_send_now_random" },
    created_at: nowIso,
  });

  return jsonResponse(result.ok ? 200 : 400, {
    ok: result.ok,
    mode: deploymentId ? "test" : "prod",
    pickedReminderId: picked.id,
    pickedTitle: picked.title,
    totalCandidates: candidates.length,
    attemptId,
    providerMessageId: result.providerMessageId,
    errorReason: result.errorReason,
  });
});
