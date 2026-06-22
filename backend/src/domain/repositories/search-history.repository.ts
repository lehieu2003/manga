import { prisma } from "../../infrastructure/database/client.js";

export const searchHistoryRepository = {
  create(userId: string, query: string) {
    return prisma.searchHistory.create({ data: { userId, query } });
  },
  async findByUser(userId: string, options: { limit: number; offset: number }) {
    const where = { userId };
    const [data, total] = await prisma.$transaction([
      prisma.searchHistory.findMany({ where, orderBy: { createdAt: "desc" }, take: options.limit, skip: options.offset }),
      prisma.searchHistory.count({ where })
    ]);

    return { data, total };
  },
  clearByUser(userId: string) {
    return prisma.searchHistory.deleteMany({ where: { userId } });
  }
};
