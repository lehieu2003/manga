import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { api, assetUrl } from "@/api";
import type { User } from "@/types";
import { compareChapters, createReaderNavItems } from "./reader.logic";
import type { ReaderQuality } from "./reader.types";

export function useReaderData({ chapterId, mangaId, user, quality }: { chapterId: string; mangaId: string; user?: User | null; quality: ReaderQuality }) {
  const queryClient = useQueryClient();
  const reader = useQuery({ queryKey: ["reader", chapterId], queryFn: () => api.getReader(chapterId), enabled: Boolean(chapterId) });
  const chapters = useInfiniteQuery({
    queryKey: ["reader-chapters", mangaId],
    queryFn: ({ pageParam }) => api.getChapters(mangaId, { limit: 100, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled: Boolean(mangaId)
  });
  const progress = useQuery({
    queryKey: ["progress", "manga", mangaId],
    queryFn: () => api.getMangaProgress(mangaId),
    enabled: Boolean(user && mangaId)
  });
  const { mutate: saveProgress } = useMutation({
    mutationFn: (input: { chapterId: string; mangaId: string; pageIndex: number; completed: boolean }) =>
      api.saveProgress(input.chapterId, { mangaId: input.mangaId, pageIndex: input.pageIndex, completed: input.completed }),
    onSuccess: async (_data, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["progress", "manga", input.mangaId] }),
        queryClient.invalidateQueries({ queryKey: ["library"] }),
        queryClient.invalidateQueries({ queryKey: ["library", input.mangaId] })
      ]);
    }
  });
  const pages = useMemo(() => {
    const urls = quality === "data-saver" ? reader.data?.dataSaverPageUrls : reader.data?.dataSaverPageUrls;
    return urls?.map(assetUrl).filter((page): page is string => Boolean(page)) ?? [];
  }, [quality, reader.data]);
  const chapterItems = useMemo(() => chapters.data?.pages.flatMap((page) => page.data) ?? [], [chapters.data]);
  const sortedChapters = useMemo(() => chapterItems.toSorted(compareChapters), [chapterItems]);
  const currentChapterIndex = sortedChapters.findIndex((chapter) => chapter.id === chapterId);
  const previousChapter = currentChapterIndex > 0 ? sortedChapters[currentChapterIndex - 1] : undefined;
  const nextChapter = currentChapterIndex >= 0 ? sortedChapters[currentChapterIndex + 1] : undefined;
  const navItems = useMemo(
    () =>
      createReaderNavItems({
        chapters: sortedChapters,
        chapterId,
        currentChapterIndex,
        chaptersProgress: progress.data?.chaptersProgress
      }),
    [chapterId, currentChapterIndex, progress.data?.chaptersProgress, sortedChapters]
  );

  return {
    queryClient,
    reader,
    chapters,
    progress,
    saveProgress,
    pages,
    sortedChapters,
    currentChapterIndex,
    previousChapter,
    nextChapter,
    navItems,
    hasMoreChapters: Boolean(chapters.hasNextPage),
    isFetchingMoreChapters: chapters.isFetchingNextPage,
    fetchMoreChapters: chapters.fetchNextPage,
    currentChapterLoaded: currentChapterIndex >= 0,
    navigationUnavailable: !mangaId
  };
}
