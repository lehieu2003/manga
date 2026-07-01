import { SocialMembershipStatus } from "@prisma/client";
import { z } from "zod";

export const socialConversationParamsSchema = z.object({
  id: z.string().trim().min(1)
});

export const socialConversationInviteParamsSchema = z.object({
  id: z.string().trim().min(1),
  userId: z.string().trim().min(1)
});

export const socialConversationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().min(1).optional(),
  membershipStatus: z.enum([SocialMembershipStatus.ACTIVE, SocialMembershipStatus.PENDING_INVITE]).default(SocialMembershipStatus.ACTIVE)
});

export const createSocialGroupConversationSchema = z.object({
  title: z.string().trim().min(1).max(80),
  memberIds: z.array(z.string().trim().min(1)).min(1).max(49)
});

export const createSocialGroupInviteSchema = z.object({
  userId: z.string().trim().min(1)
});

export const resolveSocialGroupInviteSchema = z.object({
  action: z.enum(["accept", "decline", "cancel"])
});

export const muteSocialConversationSchema = z.object({
  mutedUntil: z
    .string()
    .datetime()
    .transform((value) => new Date(value))
    .nullable()
});
