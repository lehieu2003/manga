import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/api";
import type { User } from "@/types";

export function useMangaDetail({ mangaId, user, showToast }: { mangaId: string; user?: User | null; showToast: (input: { kind: "success" | "error" | "info"; title: string; description: string }) => void }) {
  const queryClient = useQueryClient();
  const [selectedLanguages, setSelectedLanguages] = useState(["vi", "en"]);
  const [chapterSearch, setChapterSearch] = useState("");
  const chapterSearchQuery = chapterSearch.trim();
  const manga = useQuery({ queryKey: ["manga", mangaId], queryFn: () => api.getManga(mangaId), enabled: Boolean(mangaId) });
  const chapters = useInfiniteQuery({
    queryKey: ["chapters", mangaId, selectedLanguages, chapterSearchQuery],
    queryFn: ({ pageParam }) => api.getChapters(mangaId, { limit: 100, offset: pageParam, translatedLanguage: selectedLanguages, q: chapterSearchQuery }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled: Boolean(mangaId && selectedLanguages.length)
  });
  const progress = useQuery({
    queryKey: ["progress", "manga", mangaId],
    queryFn: () => api.getMangaProgress(mangaId),
    enabled: Boolean(user && mangaId)
  });
  const libraryItem = useQuery({
    queryKey: ["library", mangaId],
    queryFn: () => api.getLibraryItem(mangaId),
    enabled: Boolean(user && mangaId)
  });
  const follow = useMutation({
    mutationFn: () => api.upsertLibrary(mangaId, { status: "READING", isFavorite: true }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["library"] }), queryClient.invalidateQueries({ queryKey: ["library", mangaId] })]);
      showToast({
        kind: "success",
        title: "Added to library",
        description: `${manga.data?.title ?? "This manga"} is ready on your shelf.`
      });
    },
    onError: (error) => {
      showToast({
        kind: "error",
        title: "Could not follow manga",
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });
  const unfollow = useMutation({
    mutationFn: () => api.removeLibrary(mangaId),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["library"] }), queryClient.invalidateQueries({ queryKey: ["library", mangaId] })]);
      showToast({
        kind: "info",
        title: "Removed from library",
        description: `${manga.data?.title ?? "This manga"} was removed from your shelf.`
      });
    },
    onError: (error) => {
      showToast({
        kind: "error",
        title: "Could not remove manga",
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  return {
    selectedLanguages,
    setSelectedLanguages,
    chapterSearch,
    setChapterSearch,
    manga,
    chapters,
    progress,
    libraryItem,
    follow,
    unfollow,
    isFollowed: Boolean(libraryItem.data?.item)
  };
}
