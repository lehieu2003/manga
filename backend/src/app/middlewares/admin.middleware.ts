import type { FastifyRequest } from "fastify";
import { env } from "../../shared/configs/app.config.js";
import { HttpError } from "../../shared/errors/http-error.js";

export function requireAdminToken(request: FastifyRequest) {
  if (!env.ADMIN_SYNC_TOKEN) {
    throw new HttpError(503, "Admin sync token is not configured", "ADMIN_SYNC_NOT_CONFIGURED");
  }

  const token = request.headers["x-admin-token"];
  if (!token) {
    throw new HttpError(401, "Admin sync token is required", "ADMIN_SYNC_TOKEN_REQUIRED");
  }
  if (Array.isArray(token) || token !== env.ADMIN_SYNC_TOKEN) {
    throw new HttpError(403, "Admin sync token is invalid", "ADMIN_SYNC_TOKEN_INVALID");
  }
}
