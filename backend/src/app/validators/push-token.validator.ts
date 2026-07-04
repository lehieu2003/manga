import { z } from "zod";

export const registerPushTokenSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(["android", "ios", "web"]).default("android"),
  deviceId: z.string().trim().min(1).max(120).optional(),
  appVersion: z.string().trim().min(1).max(80).optional()
});

export const unregisterPushTokenSchema = z.object({
  token: z.string().trim().min(20).max(4096)
});
