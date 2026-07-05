import { prisma } from "../../infrastructure/database/client.js";

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
  findByFirebaseUid(firebaseUid: string) {
    return prisma.user.findUnique({ where: { firebaseUid } });
  },
  findByIdOrThrow(id: string) {
    return prisma.user.findUniqueOrThrow({ where: { id } });
  },
  create(data: { email: string; passwordHash?: string | null; firebaseUid?: string | null; displayName: string; avatarUrl?: string | null; emailVerifiedAt?: Date | null }) {
    return prisma.user.create({ data });
  },
  linkFirebaseUid(userId: string, data: { firebaseUid: string; emailVerifiedAt?: Date }) {
    return prisma.user.update({ where: { id: userId }, data });
  },
  updateProfile(userId: string, data: { displayName?: string; avatarUrl?: string | null }) {
    return prisma.user.update({ where: { id: userId }, data });
  },
  updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },
  markEmailVerified(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  }
};
