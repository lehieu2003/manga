import { env } from "./shared/configs/app.config.js";
import { prisma } from "./infrastructure/database/client.js";
import { redis } from "./infrastructure/cache/client.js";
import { closeRealtimeServer, registerRealtimeServer } from "./infrastructure/realtime/socket-server.js";
import { startSocialCallTimeoutSweep } from "./domain/services/social-call.service.js";
import { buildApp } from "./server.js";

const app = await buildApp();
await registerRealtimeServer(app);
const stopSocialCallTimeoutSweep = startSocialCallTimeoutSweep({ log: app.log });

const shutdown = async () => {
  app.log.info("Shutting down");
  stopSocialCallTimeoutSweep();
  await closeRealtimeServer();
  await app.close();
  await prisma.$disconnect();
  redis.disconnect();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ host: env.HOST, port: env.PORT });
