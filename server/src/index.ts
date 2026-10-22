import * as Sentry from "@sentry/node";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";

if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    tracesSampleRate: 0.1,
  });
}

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[panicplan] server listening on :${config.port} (${config.nodeEnv})`);
});

async function shutdown(signal: string) {
  console.log(`[panicplan] ${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

export default app;
