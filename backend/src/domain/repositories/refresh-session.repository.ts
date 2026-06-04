import { prisma } from "../../infrastructure/database/client.js";

export const refreshSessionRepository = {
  create(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.refreshSession.create({ data });
  },
  findActiveByTokenHash(tokenHash: string) {
    return prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true }
    });
  },
  revokeById(id: string) {
    return prisma.refreshSession.update({
      where: { id },
      data: { revokedAt: new Date() }
    });
  },
  revokeByTokenHash(tokenHash: string) {
    return prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  },
  revokeByUserId(userId: string) {
    return prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
};
