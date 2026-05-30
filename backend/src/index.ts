import { env } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { buildApp } from "./server.js";

const app = await buildApp();

const shutdown = async () => {
  app.log.info("Shutting down");
  await app.close();
  await prisma.$disconnect();
  redis.disconnect();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ host: env.HOST, port: env.PORT });
