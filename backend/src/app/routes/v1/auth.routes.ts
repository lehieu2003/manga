import type { FastifyInstance } from 'fastify';
import {
  handleChangeCurrentUserPassword,
  handleGetCurrentUser,
  handleLoginUser,
  handleLogoutUser,
  handleRefreshAuthToken,
  handleRegisterUser,
  handleRequestPasswordReset,
  handleResendEmailVerification,
  handleResetPassword,
  handleUpdateCurrentUser,
  handleUploadCurrentUserAvatar,
  handleVerifyEmail,
} from '../../controllers/auth.controller.js';
import { authRouteSchemas } from '../../docs/route-schemas.js';

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/register',
    { schema: authRouteSchemas.register },
    handleRegisterUser,
  );

  app.post(
    '/auth/login',
    { schema: authRouteSchemas.login },
    handleLoginUser,
  );

  app.post(
    '/auth/refresh',
    { schema: authRouteSchemas.refresh },
    handleRefreshAuthToken,
  );

  app.post(
    '/auth/logout',
    { schema: authRouteSchemas.logout },
    handleLogoutUser,
  );

  app.post(
    '/auth/email/verify',
    { schema: authRouteSchemas.verifyEmail },
    handleVerifyEmail,
  );

  app.post(
    '/auth/email/verification',
    { schema: authRouteSchemas.resendVerification },
    handleResendEmailVerification,
  );

  app.post(
    '/auth/password/forgot',
    { schema: authRouteSchemas.forgotPassword },
    handleRequestPasswordReset,
  );

  app.post(
    '/auth/password/reset',
    { schema: authRouteSchemas.resetPassword },
    handleResetPassword,
  );

  app.get(
    '/me',
    { schema: authRouteSchemas.me, preHandler: app.authenticate },
    handleGetCurrentUser,
  );

  app.patch(
    '/me',
    { schema: authRouteSchemas.updateMe, preHandler: app.authenticate },
    handleUpdateCurrentUser,
  );

  app.post(
    '/me/avatar',
    { schema: authRouteSchemas.uploadAvatar, preHandler: app.authenticate },
    handleUploadCurrentUserAvatar,
  );

  app.put(
    '/me/password',
    { schema: authRouteSchemas.changePassword, preHandler: app.authenticate },
    handleChangeCurrentUserPassword,
  );
}
