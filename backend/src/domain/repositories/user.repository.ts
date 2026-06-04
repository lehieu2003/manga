import { prisma } from "../../infrastructure/database/client.js";

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
  findByIdOrThrow(id: string) {
    return prisma.user.findUniqueOrThrow({ where: { id } });
  },
  create(data: { email: string; passwordHash: string; displayName: string }) {
    return prisma.user.create({ data });
  },
  updateProfile(userId: string, data: { displayName?: string; avatarUrl?: string | null }) {
    return prisma.user.update({ where: { id: userId }, data });
  },
  updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
};
