import { prisma } from "../infrastructure/database/client.js";
import { redis } from "../infrastructure/cache/client.js";
import { saveChapterBatch, saveMangaBatch } from "../domain/services/catalog-cache.service.js";
import type { ChapterSummary, MangaSummary } from "../infrastructure/mangadex/mangadex.types.js";

const manga: MangaSummary[] = [
  {
    id: "391b0423-d847-456f-aff0-8b0cfc03066b",
    title: "Berserk",
    altTitles: ["Berserk"],
    description: "A dark fantasy epic cached as demo data while MangaDex network access is unavailable.",
    status: "ongoing",
    year: 1989,
    contentRating: "suggestive",
    tags: ["Action", "Adventure", "Drama", "Fantasy"],
    authors: ["Kentaro Miura"],
    artists: ["Kentaro Miura"],
    coverUrl: "https://uploads.mangadex.org/covers/391b0423-d847-456f-aff0-8b0cfc03066b/9dca1dc9-9e24-4f0e-bdf4-acdf2160d010.512.jpg"
  },
  {
    id: "a96676e5-8ae2-425e-b549-7f15dd34a6d8",
    title: "One Punch-Man",
    altTitles: ["Onepunch-Man", "OPM"],
    description: "A hero who defeats enemies with one punch searches for a real challenge.",
    status: "ongoing",
    year: 2012,
    contentRating: "safe",
    tags: ["Action", "Comedy", "Superhero"],
    authors: ["ONE"],
    artists: ["Yusuke Murata"],
    coverUrl: "https://uploads.mangadex.org/covers/a96676e5-8ae2-425e-b549-7f15dd34a6d8/8cb80e56-8d9d-4f70-9d3a-0a4cc6b5379f.512.jpg"
  },
  {
    id: "32ee02ab-c8f5-4b2f-b4f4-4f8b903f720a",
    title: "Sousou no Frieren",
    altTitles: ["Frieren: Beyond Journey's End"],
    description: "An elf mage reflects on time, memory, and the people she met after the hero's journey.",
    status: "ongoing",
    year: 2020,
    contentRating: "safe",
    tags: ["Adventure", "Drama", "Fantasy", "Slice of Life"],
    authors: ["Kanehito Yamada"],
    artists: ["Tsukasa Abe"],
    coverUrl: "https://uploads.mangadex.org/covers/32ee02ab-c8f5-4b2f-b4f4-4f8b903f720a/5b8f4f4b-9788-4f89-b3a9-a30e8f2e5c9c.512.jpg"
  }
];

const chapters: Record<string, ChapterSummary[]> = Object.fromEntries(
  manga.map((item) => [
    item.id,
    [
      {
        id: crypto.randomUUID(),
        title: "Demo cached chapter",
        chapter: "1",
        volume: "1",
        translatedLanguage: "en",
        publishAt: new Date().toISOString(),
        pages: 0,
        scanlationGroup: "Local seed"
      }
    ]
  ])
);

try {
  await saveMangaBatch(manga);
  for (const item of manga) {
    await saveChapterBatch(item.id, chapters[item.id]);
  }
  console.log(`Seeded ${manga.length} cached manga for local UI testing.`);
} finally {
  await prisma.$disconnect();
  redis.disconnect();
}
