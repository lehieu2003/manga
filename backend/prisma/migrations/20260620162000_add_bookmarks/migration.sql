-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pageIndex" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_chapterId_key" ON "Bookmark"("userId", "chapterId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_mangaId_idx" ON "Bookmark"("userId", "mangaId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_updatedAt_idx" ON "Bookmark"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
