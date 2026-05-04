import type { ReminderProvider } from "../providers/types.ts";
import type { ReminderRepository } from "../reminders/repository.ts";
import { runReminderBatch } from "./runReminderBatch.ts";

export interface BatchRouteOptions {
  repo: ReminderRepository;
  pushProvider: ReminderProvider;
  batchSecret?: string;
}

export async function runProtectedBatch(options: BatchRouteOptions, providedSecret?: string) {
  const expectedSecret = options.batchSecret ?? process.env.BATCH_SECRET;
  if (expectedSecret && providedSecret !== expectedSecret) {
    return { statusCode: 401, body: { error: "unauthorized_batch_request" } };
  }
  return {
    statusCode: 200,
    body: await runReminderBatch(options.repo, {
      pushProvider: options.pushProvider,
    }),
  };
}
