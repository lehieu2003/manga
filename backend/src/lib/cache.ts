import { redis, redisReady } from "./redis.js";

const memoryCache = new Map<string, { expiresAt: number; value: string }>();

export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  if (redisReady) {
    const existing = await redis.get(key);
    if (existing) {
      return JSON.parse(existing) as T;
    }

    const value = await loader();
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return value;
  }

  const now = Date.now();
  const existing = memoryCache.get(key);
  if (existing && existing.expiresAt > now) {
    return JSON.parse(existing.value) as T;
  }

  const value = await loader();
  memoryCache.set(key, {
    value: JSON.stringify(value),
    expiresAt: now + ttlSeconds * 1000
  });
  return value;
}

export function makeCacheKey(prefix: string, params: Record<string, unknown>) {
  const stable = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  return `${prefix}:${JSON.stringify(stable)}`;
}
