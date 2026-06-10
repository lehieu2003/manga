-- AlterTable
ALTER TABLE "CachedManga" ADD COLUMN "authors" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CachedManga" ADD COLUMN "artists" TEXT[] DEFAULT ARRAY[]::TEXT[];
