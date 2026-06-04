import { prisma } from "../../infrastructure/database/client.js";

export const searchHistoryRepository = {
  create(userId: string, query: string) {
    return prisma.searchHistory.create({ data: { userId, query } });
  }
};
