import type { FastifyInstance } from 'fastify';
import {
  changeCurrentUserPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  requestPasswordReset,
  refreshAuthToken,
  registerUser,
  resendEmailVerification,
  resetPassword,
  updateCurrentUser,
  verifyEmail,
} from '../../controllers/auth.controller.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from '../../validators/auth.validator.js';
import { authRouteSchemas } from '../../docs/route-schemas.js';

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/register',
    { schema: authRouteSchemas.register },
    async (request, reply) => {
      const body = registerSchema.parse(request.body);
      return reply.code(201).send(await registerUser(body));
    },
  );

  app.post(
    '/auth/login',
    { schema: authRouteSchemas.login },
    async (request) => {
      const body = loginSchema.parse(request.body);
      return loginUser(app, body);
    },
  );

  app.post(
    '/auth/refresh',
    { schema: authRouteSchemas.refresh },
    async (request) => {
      const body = refreshSchema.parse(request.body);
      return refreshAuthToken(app, body);
    },
  );

  app.post(
    '/auth/logout',
    { schema: authRouteSchemas.logout },
    async (request) => {
      const body = refreshSchema.parse(request.body);
      return logoutUser(body);
    },
  );

  app.post(
    '/auth/email/verify',
    { schema: authRouteSchemas.verifyEmail },
    async (request) => {
      const body = verifyEmailSchema.parse(request.body);
      return verifyEmail(app, body);
    },
  );

  app.post(
    '/auth/email/verification',
    { schema: authRouteSchemas.resendVerification },
    async (request) => {
      const body = resendVerificationSchema.parse(request.body);
      return resendEmailVerification(body);
    },
  );

  app.post(
    '/auth/password/forgot',
    { schema: authRouteSchemas.forgotPassword },
    async (request) => {
      const body = forgotPasswordSchema.parse(request.body);
      return requestPasswordReset(body);
    },
  );

  app.post(
    '/auth/password/reset',
    { schema: authRouteSchemas.resetPassword },
    async (request) => {
      const body = resetPasswordSchema.parse(request.body);
      return resetPassword(body);
    },
  );

  app.get(
    '/me',
    { schema: authRouteSchemas.me, preHandler: app.authenticate },
    async (request) => {
      return getCurrentUser(request.user.sub);
    },
  );

  app.patch(
    '/me',
    { schema: authRouteSchemas.updateMe, preHandler: app.authenticate },
    async (request) => {
      const body = updateProfileSchema.parse(request.body);
      return updateCurrentUser(request.user.sub, body);
    },
  );

  app.put(
    '/me/password',
    { schema: authRouteSchemas.changePassword, preHandler: app.authenticate },
    async (request) => {
      const body = changePasswordSchema.parse(request.body);
      return changeCurrentUserPassword(app, request.user.sub, body);
    },
  );
}
