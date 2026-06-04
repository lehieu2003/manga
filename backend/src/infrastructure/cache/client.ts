import { Redis } from "ioredis";
import { env } from "../../shared/configs/app.config.js";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false
});

export let redisReady = false;

redis.on("error", () => {
  redisReady = false;
});

export async function connectRedis() {
  if (redis.status === "wait") {
    try {
      await redis.connect();
      redisReady = true;
    } catch {
      redisReady = false;
    }
  }

  return redisReady;
}
