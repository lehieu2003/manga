export type ProgressEvent = {
  type: "progress.chapter_saved";
  userId: string;
  mangaId: string;
  chapterId: string;
  pageIndex: number;
  completed: boolean;
};
