-- CreateTable
CREATE TABLE "CachedManga" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "altTitles" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT,
    "year" INTEGER,
    "contentRating" TEXT,
    "tags" TEXT[],
    "coverUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'mangadex',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedManga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedChapter" (
    "id" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "chapter" TEXT,
    "volume" TEXT,
    "translatedLanguage" TEXT NOT NULL,
    "publishAt" TIMESTAMP(3),
    "pages" INTEGER NOT NULL DEFAULT 0,
    "scanlationGroup" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedChapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CachedManga_title_idx" ON "CachedManga"("title");

-- CreateIndex
CREATE INDEX "CachedManga_fetchedAt_idx" ON "CachedManga"("fetchedAt");

-- CreateIndex
CREATE INDEX "CachedChapter_mangaId_translatedLanguage_idx" ON "CachedChapter"("mangaId", "translatedLanguage");

-- CreateIndex
CREATE INDEX "CachedChapter_mangaId_chapter_idx" ON "CachedChapter"("mangaId", "chapter");

-- CreateIndex
CREATE INDEX "CachedChapter_publishAt_idx" ON "CachedChapter"("publishAt");

-- AddForeignKey
ALTER TABLE "CachedChapter" ADD CONSTRAINT "CachedChapter_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "CachedManga"("id") ON DELETE CASCADE ON UPDATE CASCADE;
