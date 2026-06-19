import { prisma } from "../../infrastructure/database/client.js";

export const emailVerificationCodeRepository = {
  create(data: { userId: string; codeHash: string; expiresAt: Date }) {
    return prisma.emailVerificationCode.create({ data });
  },
  findLatestByUserId(userId: string) {
    return prisma.emailVerificationCode.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: "desc" }
    });
  },
  markUsed(id: string) {
    return prisma.emailVerificationCode.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() }
    });
  },
  markUserCodesUsed(userId: string) {
    return prisma.emailVerificationCode.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() }
    });
  }
};
