import { createServer, type IncomingHttpHeaders, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { runProtectedBatch } from "./batch/routes.ts";
import { sendNowRandom } from "./admin/sendNowRandom.ts";
import { createDb } from "./db/client.ts";
import { migrate } from "./db/schema.ts";
import { createPushProvider } from "./providers/pushProviderFactory.ts";
import type { ReminderProvider } from "./providers/types.ts";
import { ReminderRepository } from "./reminders/repository.ts";
import { createReminder, publicReminder, type CreateReminderPayload } from "./reminders/routes.ts";
import type { ReminderIntensity } from "./reminders/types.ts";

export interface BuildAppOptions {
  databasePath?: string;
  batchSecret?: string;
  pushProvider?: ReminderProvider;
}

export interface InjectOptions {
  method: string;
  url: string;
  headers?: IncomingHttpHeaders;
  payload?: unknown;
}

export interface InjectResponse {
  statusCode: number;
  body: string;
  json(): any;
}

function jsonResponse(statusCode: number, body: unknown): InjectResponse {
  return {
    statusCode,
    body: JSON.stringify(body),
    json() {
      return JSON.parse(this.body);
    },
  };
}

function isIntensity(value: unknown): value is ReminderIntensity {
  return value === "gentle" || value === "normal" || value === "strong";
}

function isCreateReminderPayload(value: any): value is CreateReminderPayload {
  return (
    value != null &&
    typeof value.tossUserKey === "string" &&
    typeof value.title === "string" &&
    typeof value.allowedStartHour === "number" &&
    typeof value.allowedEndHour === "number" &&
    value.allowedStartHour >= 0 &&
    value.allowedEndHour <= 24 &&
    value.allowedStartHour < value.allowedEndHour &&
    isIntensity(value.intensity)
  );
}

function getReminderId(pathname: string, suffix: string) {
  if (!pathname.startsWith("/api/reminders/") || !pathname.endsWith(suffix)) {
    return null;
  }
  return pathname.slice("/api/reminders/".length, -suffix.length);
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

export function buildApp(options: BuildAppOptions = {}) {
  const store = createDb(options.databasePath);
  migrate(store);
  const repo = new ReminderRepository(store);
  const pushProvider = options.pushProvider ?? createPushProvider();

  async function inject(input: InjectOptions): Promise<InjectResponse> {
    await store.ready;
    const method = input.method.toUpperCase();
    const url = new URL(input.url, "http://localhost");
    const body = input.payload as any;

    if (method === "GET" && url.pathname === "/health") {
      return jsonResponse(200, { ok: true });
    }

    if (method === "POST" && url.pathname === "/api/auth/login") {
      const authCode = body?.authorizationCode;
      const referrer = body?.referrer;

      if (typeof authCode !== "string" || typeof referrer !== "string") {
        return jsonResponse(400, { error: "invalid_login_input", message: "authorizationCode와 referrer가 필요해요." });
      }

      // 로컬 개발 환경: mock 로그인
      if (referrer === "SANDBOX" && authCode === "local-dev-auth-code") {
        const user = repo.upsertUser({ tossUserKey: "local-dev-user" });
        return jsonResponse(200, { userKey: user.tossUserKey, accessToken: "local-dev-token" });
      }

      try {
        // 1. 인가 코드로 access token 발급
        const tokenRes = await fetch("https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/generate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorizationCode: authCode, referrer }),
        });
        if (!tokenRes.ok) {
          const err = await tokenRes.json().catch(() => ({})) as any;
          return jsonResponse(401, { error: "token_exchange_failed", message: err.error ?? "토큰 발급에 실패했어요." });
        }
        const tokenData = await tokenRes.json() as { accessToken: string; refreshToken: string };

        // 2. access token으로 사용자 정보 조회
        const meRes = await fetch("https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/login-me", {
          headers: { Authorization: `Bearer ${tokenData.accessToken}` },
        });
        if (!meRes.ok) {
          return jsonResponse(401, { error: "user_info_failed", message: "사용자 정보를 가져올 수 없어요." });
        }
        const meData = await meRes.json() as { userKey: string };

        // 3. 사용자 upsert
        const user = repo.upsertUser({ tossUserKey: String(meData.userKey) });
        return jsonResponse(200, { userKey: user.tossUserKey, accessToken: tokenData.accessToken });
      } catch (err: any) {
        return jsonResponse(500, { error: "login_error", message: err.message ?? "로그인 중 오류가 발생했어요." });
      }
    }

    if (method === "POST" && url.pathname === "/api/reminders") {
      if (!isCreateReminderPayload(body)) {
        return jsonResponse(400, { error: "invalid_reminder_input" });
      }
      const reminder = createReminder(repo, body);
      return jsonResponse(201, { reminder: publicReminder(reminder) });
    }

    if (method === "GET" && url.pathname === "/api/reminders") {
      const tossUserKey = url.searchParams.get("tossUserKey");
      if (!tossUserKey) return jsonResponse(400, { error: "missing_toss_user_key" });
      return jsonResponse(200, { reminders: repo.listRemindersForTossUserKey(tossUserKey).map(publicReminder) });
    }

    // PUT /api/reminders/:id — 리마인더 수정
    if (method === "PUT" && url.pathname.startsWith("/api/reminders/") && !url.pathname.includes("/complete") && !url.pathname.includes("/snooze")) {
      const id = url.pathname.slice("/api/reminders/".length);
      if (!id) return jsonResponse(400, { error: "missing_reminder_id" });
      const reminder = repo.updateReminder(id, { title: body?.title, intensity: isIntensity(body?.intensity) ? body.intensity : undefined });
      return reminder ? jsonResponse(200, { reminder: publicReminder(reminder) }) : jsonResponse(404, { error: "reminder_not_found" });
    }

    if (method === "POST" && getReminderId(url.pathname, "/complete") != null) {
      const reminder = repo.updateReminderStatus(getReminderId(url.pathname, "/complete") as string, "completed");
      return reminder ? jsonResponse(200, { reminder: publicReminder(reminder) }) : jsonResponse(404, { error: "reminder_not_found" });
    }

    if (method === "POST" && getReminderId(url.pathname, "/snooze") != null) {
      const id = getReminderId(url.pathname, "/snooze") as string;
      const existing = repo.getReminder(id);
      if (!existing) return jsonResponse(404, { error: "reminder_not_found" });

      let snoozedUntil: string | null;
      if (typeof body?.snoozedUntil === "string") {
        snoozedUntil = body.snoozedUntil;
      } else if (body?.snoozedUntil === null) {
        snoozedUntil = null;
      } else {
        // Toggle: if already snoozed, unsnooze; otherwise snooze until end of today (KST)
        if (existing.snoozedUntil && new Date(existing.snoozedUntil) > new Date()) {
          snoozedUntil = null;
        } else {
          const now = new Date();
          const kstOffset = 9 * 60 * 60 * 1000;
          const kstNow = new Date(now.getTime() + kstOffset);
          const endOfDayKST = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate(), 23, 59, 59, 999));
          snoozedUntil = new Date(endOfDayKST.getTime() - kstOffset).toISOString();
        }
      }

      const reminder = snoozedUntil === null
        ? repo.unsnoozeReminder(id)
        : repo.snoozeReminder(id, snoozedUntil);
      return reminder ? jsonResponse(200, { reminder: publicReminder(reminder) }) : jsonResponse(404, { error: "reminder_not_found" });
    }

    if (method === "GET" && url.pathname === "/api/inbox") {
      const tossUserKey = url.searchParams.get("tossUserKey");
      if (!tossUserKey) return jsonResponse(400, { error: "missing_toss_user_key" });
      return jsonResponse(200, repo.listInboxForTossUserKey(tossUserKey));
    }

    if (method === "POST" && url.pathname === "/api/admin/send-now-random") {
      const expectedSecret = options.batchSecret ?? process.env.BATCH_SECRET;
      const providedSecret = String(input.headers?.["x-batch-secret"] ?? "");
      if (expectedSecret && providedSecret !== expectedSecret) {
        return jsonResponse(401, { error: "unauthorized_admin_request" });
      }
      const tossUserKey = body?.tossUserKey;
      if (typeof tossUserKey !== "string" || tossUserKey.length === 0) {
        return jsonResponse(400, { error: "missing_toss_user_key" });
      }
      const result = await sendNowRandom(repo, pushProvider, { tossUserKey });
      return jsonResponse(result.ok ? 200 : 400, result);
    }

    if (method === "POST" && url.pathname === "/api/batch/reminders") {
      const result = await runProtectedBatch(
        {
          repo,
          pushProvider,
          batchSecret: options.batchSecret,
        },
        String(input.headers?.["x-batch-secret"] ?? ""),
      );
      return jsonResponse(result.statusCode, result.body);
    }

    return jsonResponse(404, { error: "not_found" });
  }

  return {
    repo,
    inject,
    async listen({ host, port }: { host: string; port: number }) {
      const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const corsHeaders = {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
          "access-control-allow-headers": "content-type,x-batch-secret",
          "content-type": "application/json; charset=utf-8",
        };
        if (req.method === "OPTIONS") {
          res.writeHead(204, corsHeaders);
          res.end();
          return;
        }
        const payload = req.method === "GET" ? undefined : await readJson(req).catch(() => undefined);
        const response = await inject({
          method: req.method ?? "GET",
          url: req.url ?? "/",
          headers: req.headers,
          payload,
        });
        res.writeHead(response.statusCode, corsHeaders);
        res.end(response.body);
      });
      await new Promise<void>((resolve) => server.listen(port, host, resolve));
      return server;
    },
    async close() {
      await store.close();
    },
  };
}
