-- CreateTable
CREATE TABLE "MangaDexTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MangaDexTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MangaDexTag_name_idx" ON "MangaDexTag"("name");

-- CreateIndex
CREATE INDEX "MangaDexTag_group_idx" ON "MangaDexTag"("group");

-- CreateIndex
CREATE INDEX "MangaDexTag_fetchedAt_idx" ON "MangaDexTag"("fetchedAt");
