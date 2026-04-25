import { loadEnvFiles } from "./env.ts";
import { buildApp } from "./app.ts";

loadEnvFiles();

const app = buildApp();
const port = Number(process.env.PORT ?? 53119);
const host = process.env.HOST ?? "127.0.0.1";

await app.listen({ host, port });
