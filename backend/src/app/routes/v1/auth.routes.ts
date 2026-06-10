import type { FastifyInstance } from "fastify";
import {
  changeCurrentUserPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAuthToken,
  registerUser,
  updateCurrentUser
} from "../../controllers/auth.controller.js";
import { changePasswordSchema, loginSchema, refreshSchema, registerSchema, updateProfileSchema } from "../../validators/auth.validator.js";
import { authRouteSchemas } from "../../docs/route-schemas.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", { schema: authRouteSchemas.register }, async (request, reply) => {
    const body = registerSchema.parse(request.body);
    return reply.code(201).send(await registerUser(app, body));
  });

  app.post("/auth/login", { schema: authRouteSchemas.login }, async (request) => {
    const body = loginSchema.parse(request.body);
    return loginUser(app, body);
  });

  app.post("/auth/refresh", { schema: authRouteSchemas.refresh }, async (request) => {
    const body = refreshSchema.parse(request.body);
    return refreshAuthToken(app, body);
  });

  app.post("/auth/logout", { schema: authRouteSchemas.logout }, async (request) => {
    const body = refreshSchema.parse(request.body);
    return logoutUser(body);
  });

  app.get("/me", { schema: authRouteSchemas.me, preHandler: app.authenticate }, async (request) => {
    return getCurrentUser(request.user.sub);
  });

  app.patch("/me", { schema: authRouteSchemas.updateMe, preHandler: app.authenticate }, async (request) => {
    const body = updateProfileSchema.parse(request.body);
    return updateCurrentUser(request.user.sub, body);
  });

  app.put("/me/password", { schema: authRouteSchemas.changePassword, preHandler: app.authenticate }, async (request) => {
    const body = changePasswordSchema.parse(request.body);
    return changeCurrentUserPassword(app, request.user.sub, body);
  });
}
