import { createServer, type IncomingHttpHeaders, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { runProtectedBatch } from "./batch/routes.ts";
import { updateSmsConsent, unsubscribeSms } from "./consents/routes.ts";
import { createDb } from "./db/client.ts";
import { migrate } from "./db/schema.ts";
import { LogPushProvider } from "./providers/logPushProvider.ts";
import { LogSmsProvider } from "./providers/logSmsProvider.ts";
import type { ReminderProvider } from "./providers/types.ts";
import { ReminderRepository } from "./reminders/repository.ts";
import { createReminder, publicReminder, type CreateReminderPayload } from "./reminders/routes.ts";
import type { ReminderIntensity } from "./reminders/types.ts";

export interface BuildAppOptions {
  databasePath?: string;
  batchSecret?: string;
  pushProvider?: ReminderProvider;
  smsProvider?: ReminderProvider;
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
  const pushProvider = options.pushProvider ?? new LogPushProvider();
  const smsProvider = options.smsProvider ?? new LogSmsProvider();

  async function inject(input: InjectOptions): Promise<InjectResponse> {
    await store.ready;
    const method = input.method.toUpperCase();
    const url = new URL(input.url, "http://localhost");
    const body = input.payload as any;

    if (method === "GET" && url.pathname === "/health") {
      return jsonResponse(200, { ok: true });
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

    if (method === "POST" && getReminderId(url.pathname, "/complete") != null) {
      const reminder = repo.updateReminderStatus(getReminderId(url.pathname, "/complete") as string, "completed");
      return reminder ? jsonResponse(200, { reminder: publicReminder(reminder) }) : jsonResponse(404, { error: "reminder_not_found" });
    }

    if (method === "POST" && getReminderId(url.pathname, "/snooze") != null) {
      const id = getReminderId(url.pathname, "/snooze") as string;
      const hours = typeof body?.hours === "number" ? body.hours : 24;
      const reminder = repo.snoozeReminder(id, new Date(Date.now() + hours * 60 * 60 * 1000).toISOString());
      return reminder ? jsonResponse(200, { reminder: publicReminder(reminder) }) : jsonResponse(404, { error: "reminder_not_found" });
    }

    if (method === "POST" && url.pathname === "/api/consents/sms") {
      if (typeof body?.tossUserKey !== "string") {
        return jsonResponse(400, { error: "invalid_sms_consent_input" });
      }
      return jsonResponse(200, {
        consent: updateSmsConsent(repo, {
          tossUserKey: body.tossUserKey,
          phoneNumber: body.phoneNumber,
          smsEnabled: body.smsEnabled ?? true,
        }),
      });
    }

    if (method === "POST" && url.pathname === "/api/consents/sms/unsubscribe") {
      if (typeof body?.tossUserKey !== "string") {
        return jsonResponse(400, { error: "invalid_sms_unsubscribe_input" });
      }
      const consent = unsubscribeSms(repo, body.tossUserKey);
      return consent ? jsonResponse(200, { consent }) : jsonResponse(404, { error: "user_not_found" });
    }

    if (method === "GET" && url.pathname === "/api/inbox") {
      const tossUserKey = url.searchParams.get("tossUserKey");
      if (!tossUserKey) return jsonResponse(400, { error: "missing_toss_user_key" });
      return jsonResponse(200, repo.listInboxForTossUserKey(tossUserKey));
    }

    if (method === "POST" && url.pathname === "/api/batch/reminders") {
      const result = await runProtectedBatch(
        {
          repo,
          pushProvider,
          smsProvider,
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
          "access-control-allow-methods": "GET,POST,OPTIONS",
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
