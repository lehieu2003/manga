import { prisma } from "../../infrastructure/database/client.js";
import { getMangaTags } from "../../infrastructure/mangadex/mangadex.client.js";
import type { MangaTagSummary } from "../../infrastructure/mangadex/mangadex.types.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TAG_REGISTRY_TTL_MS = 24 * 60 * 60 * 1000;

export async function refreshMangaDexTagRegistry() {
  const tags = await getMangaTags();
  await Promise.all(
    tags.map((tag) =>
      prisma.mangaDexTag.upsert({
        where: { id: tag.id },
        create: toTagData(tag),
        update: toTagData(tag)
      })
    )
  );
  return tags;
}

export async function listMangaDexTags() {
  await ensureFreshMangaDexTagRegistry();
  const tags = await prisma.mangaDexTag.findMany({ orderBy: [{ group: "asc" }, { name: "asc" }] });
  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    group: tag.group,
    aliases: tag.aliases
  }));
}

export async function resolveMangaDexTagFilters(input: { included: string[]; excluded: string[] }) {
  await ensureFreshMangaDexTagRegistry();
  const tags = await prisma.mangaDexTag.findMany();
  const lookup = buildTagLookup(tags);

  return {
    includedTagIds: resolveTagValues(input.included, lookup),
    excludedTagIds: resolveTagValues(input.excluded, lookup),
    unresolvedIncluded: unresolvedTagValues(input.included, lookup),
    unresolvedExcluded: unresolvedTagValues(input.excluded, lookup)
  };
}

async function ensureFreshMangaDexTagRegistry() {
  const latest = await prisma.mangaDexTag.findFirst({ orderBy: { fetchedAt: "desc" }, select: { fetchedAt: true } });
  if (latest && Date.now() - latest.fetchedAt.getTime() < TAG_REGISTRY_TTL_MS) return;
  await refreshMangaDexTagRegistry();
}

function resolveTagValues(values: string[], lookup: Map<string, string>) {
  return [...new Set(values.map((value) => resolveTagValue(value, lookup)).filter((value): value is string => Boolean(value)))];
}

function unresolvedTagValues(values: string[], lookup: Map<string, string>) {
  return values.filter((value) => !resolveTagValue(value, lookup));
}

function resolveTagValue(value: string, lookup: Map<string, string>) {
  if (UUID_PATTERN.test(value)) return value;
  return lookup.get(normalizeTagName(value));
}

function buildTagLookup(tags: Array<{ id: string; name: string; aliases: string[] }>) {
  const lookup = new Map<string, string>();
  for (const tag of tags) {
    lookup.set(normalizeTagName(tag.name), tag.id);
    for (const alias of tag.aliases) {
      lookup.set(normalizeTagName(alias), tag.id);
    }
  }
  return lookup;
}

function normalizeTagName(value: string) {
  return value.trim().toLowerCase();
}

function toTagData(tag: MangaTagSummary) {
  return {
    id: tag.id,
    name: tag.name,
    group: tag.group,
    aliases: tag.aliases,
    fetchedAt: new Date()
  };
}
