export type User = {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
};

export type MangaSummary = {
  id: string;
  title: string;
  altTitles: string[];
  description: string;
  status?: string;
  year?: number;
  contentRating?: string;
  tags: string[];
  authors?: string[];
  artists?: string[];
  coverUrl?: string;
};

export type GenreSummary = {
  id?: string;
  name: string;
  group?: string;
  aliases?: string[];
  count: number;
};

export type ChapterSummary = {
  id: string;
  title: string;
  chapter: string | null;
  volume: string | null;
  translatedLanguage: string;
  publishAt: string;
  pages: number;
  scanlationGroup?: string;
};

export type Paginated<T> = {
  data: T[];
  limit: number;
  offset: number;
  total: number;
  source?: "live" | "cache" | "db";
  needsSync?: boolean;
};

export type ReaderPayload = {
  baseUrl: string;
  hash: string;
  pages: string[];
  dataSaverPages: string[];
  pageUrls: string[];
  dataSaverPageUrls: string[];
};

export type LibraryItem = {
  id: string;
  userId: string;
  mangaId: string;
  status: "READING" | "PLAN_TO_READ" | "COMPLETED" | "PAUSED" | "DROPPED";
  isFavorite: boolean;
  lastChapterId: string | null;
  lastReadAt: string | null;
  createdAt: string;
  updatedAt: string;
  manga?: Pick<MangaSummary, "id" | "title" | "coverUrl" | "status" | "year" | "tags"> | null;
  readingProgress?: ReadingProgress | null;
};

export type ReadingProgress = {
  id: string;
  userId: string;
  mangaId: string;
  chapterId: string;
  pageIndex: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Bookmark = {
  id: string;
  userId: string;
  mangaId: string;
  chapterId: string;
  pageIndex: number;
  note: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  manga?: Pick<MangaSummary, "id" | "title" | "coverUrl" | "status" | "year" | "tags"> | null;
  chapter?: Pick<ChapterSummary, "id" | "title" | "chapter" | "volume" | "translatedLanguage" | "pages" | "scanlationGroup"> | null;
};

export type BookmarkListResponse = {
  data: Bookmark[];
  limit: number;
  offset: number;
  total: number;
};

export type MangaProgressPayload = {
  progress: ReadingProgress | null;
  chaptersProgress: ReadingProgress[];
  chapter?: ChapterSummary | null;
};

export type AdminOverview = {
  users: number;
  activeSessions: number;
  cachedManga: number;
  cachedChapters: number;
  libraryItems: number;
  readingProgress: number;
  searchHistory: number;
  latestCatalogFetchAt: string | null;
};

export type CatalogImportResponse = {
  status: "completed";
  summary: {
    mangaId: string;
    mangaSaved: boolean;
    chaptersFetched: number;
    readableChaptersSaved: number;
    zeroPageChaptersSkipped: number;
    source: "mangadex";
  };
};

export type CatalogSyncResponse = {
  status: "completed";
  summary: {
    mangaCount: number;
    cachedTotal: number;
  };
};

export type AdminRagStatus = {
  cached: {
    manga: number;
    chapters: number;
  };
  ragDocuments: {
    total: number;
    manga: number;
    chapter: number;
    latestIndexedAt: string | null;
    embeddingModel: string | null;
  };
  chat: {
    activeConversations: number;
    messages: number;
  };
  coverage: {
    mangaIndexed: number;
    chapterIndexed: number;
  };
};

export type AdminRagDocumentRow = {
  id: string;
  sourceType: "MANGA" | "CHAPTER";
  sourceId: string;
  parentSourceId: string | null;
  title: string;
  contentPreview: string;
  metadata: unknown;
  contentHash: string;
  embeddingModel: string;
  indexedAt: string | null;
  updatedAt: string;
};

export type AdminRagReindexResponse = {
  status: "completed";
  summary: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  durationMs: number;
};

export type AdminCacheMangaRow = Pick<MangaSummary, "id" | "title" | "coverUrl" | "status" | "year" | "tags"> & {
  fetchedAt: string;
  updatedAt: string;
  chapterCount: number;
};

export type AdminCacheMangaDetail = AdminCacheMangaRow &
  Pick<MangaSummary, "altTitles" | "description" | "contentRating">;

export type AdminUser = User & {
  counts: {
    activeSessions: number;
    libraryItems: number;
    readingProgress: number;
    searchHistory: number;
  };
};

export type AdminUserLibraryRow = LibraryItem;

export type AdminUserProgressRow = ReadingProgress & {
  manga?: Pick<MangaSummary, "id" | "title" | "coverUrl" | "status" | "year" | "tags"> | null;
  chapter?: Pick<ChapterSummary, "id" | "title" | "chapter" | "volume" | "translatedLanguage" | "pages" | "scanlationGroup"> | null;
};

export type AdminSearchHistoryRow = {
  id: string;
  userId: string;
  query: string;
  createdAt: string;
};

export type SearchHistoryItem = AdminSearchHistoryRow;

export type ChatSource = {
  type: "manga" | "chapter";
  id: string;
  title: string;
  reason: string;
  coverUrl?: string;
  score?: number;
};

export type ChatSuggestedAction = {
  type: "open_manga" | "open_chapter";
  label: string;
  targetId: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  suggestedActions?: ChatSuggestedAction[];
  createdAt: string;
};

export type SendChatMessageResponse = {
  conversationId: string;
  message: ChatMessage;
};

export type CommentTargetType = "MANGA" | "CHAPTER";
export type CommentStatus = "VISIBLE" | "DELETED" | "HIDDEN";
export type CommentReactionType = "LIKE" | "HEART" | "SAD" | "LAUGH" | "ANGRY";
export type NotificationType = "COMMENT_REPLY" | "COMMENT_REACTION" | "FRIEND_REQUEST" | "FRIEND_ACCEPTED" | "CHAT_MESSAGE" | "GROUP_INVITE" | "MISSED_CALL";
export type NotificationSubjectType = "COMMENT" | "FRIENDSHIP" | "CONVERSATION" | "MESSAGE" | "CALL";

export type CommentAuthor = Pick<User, "id" | "displayName" | "avatarUrl" | "role">;

export type CommentItem = {
  id: string;
  targetType: CommentTargetType;
  targetId: string;
  author: CommentAuthor | null;
  parentId: string | null;
  rootId: string | null;
  depth: number;
  content: string;
  isSpoiler: boolean;
  status: CommentStatus;
  deletedAt: string | null;
  hiddenAt: string | null;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  reactionCounts: Record<CommentReactionType, number>;
  currentUserReaction: CommentReactionType | null;
};

export type CommentListResponse = {
  data: CommentItem[];
  nextCursor: string | null;
};

export type UserNotification = {
  id: string;
  actor: Pick<User, "id" | "displayName" | "avatarUrl">;
  type: NotificationType;
  subjectType: NotificationSubjectType;
  subjectId: string;
  commentId?: string;
  targetType?: CommentTargetType;
  targetId?: string;
  friendshipId?: string;
  conversationId?: string;
  messageId?: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  data: UserNotification[];
  unreadCount: number;
};

export type SocialConversationType = "DM" | "GROUP";
export type SocialMemberRole = "OWNER" | "ADMIN" | "MEMBER";
export type SocialMembershipStatus = "ACTIVE" | "PENDING_INVITE" | "LEFT";
export type SocialMessageType = "TEXT" | "MANGA_SHARE" | "IMAGE" | "SYSTEM" | "VOICE_NOTE";
export type CallStatus = "RINGING" | "ACTIVE" | "ENDED" | "MISSED" | "DECLINED";
export type CallMediaType = "AUDIO" | "VIDEO";
export type CallParticipantStatus = "INVITED" | "JOINED" | "DECLINED" | "LEFT" | "MISSED";

export type FriendshipStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";

export type Friendship = {
  id: string;
  userAId: string;
  userBId: string;
  requestedById: string;
  blockedById: string | null;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
  friend: Pick<User, "id" | "displayName" | "avatarUrl">;
};

export type FriendshipListResponse = {
  data: Friendship[];
};

export type SocialUserSearchResponse = {
  data: Array<Pick<User, "id" | "displayName" | "avatarUrl">>;
};

export type SocialMember = {
  id: string;
  userId: string;
  role: SocialMemberRole;
  status: SocialMembershipStatus;
  joinedAt: string;
  user: Pick<User, "id" | "displayName" | "avatarUrl">;
};

export type SocialCurrentMember = {
  id: string;
  role: SocialMemberRole;
  status: SocialMembershipStatus;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  mutedUntil: string | null;
  joinedAt: string;
};

export type MangaShareAttachment = {
  kind: "MANGA_SHARE";
  manga: Pick<MangaSummary, "id" | "title" | "coverUrl" | "status" | "year" | "contentRating" | "tags">;
  chapter: Pick<ChapterSummary, "id" | "title" | "chapter" | "translatedLanguage" | "pages"> | null;
};

export type SocialMessage = {
  id: string;
  conversationId: string;
  senderId: string | null;
  clientMessageId: string | null;
  type: SocialMessageType;
  content: string | null;
  attachments: unknown;
  replyToId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sender: Pick<User, "id" | "displayName" | "avatarUrl"> | null;
  reactionCounts: Record<string, number>;
  currentUserReactions: string[];
};

export type SocialConversation = {
  id: string;
  type: SocialConversationType;
  title: string | null;
  avatarUrl: string | null;
  directKey: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  currentMember: SocialCurrentMember | null;
  members: SocialMember[];
  latestMessage: Omit<SocialMessage, "clientMessageId" | "replyToId" | "updatedAt" | "reactionCounts" | "currentUserReactions"> | null;
};

export type SocialConversationListResponse = {
  data: SocialConversation[];
  nextCursor: string | null;
};

export type SocialMessageListResponse = {
  data: SocialMessage[];
  nextCursor: string | null;
};

export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type CallParticipant = {
  id: string;
  callId: string;
  userId: string;
  status: CallParticipantStatus;
  joinedAt: string | null;
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, "id" | "displayName" | "avatarUrl">;
};

export type SocialCall = {
  id: string;
  conversationId: string;
  initiatorId: string;
  status: CallStatus;
  mediaType: CallMediaType;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  initiator: Pick<User, "id" | "displayName" | "avatarUrl">;
  participants: CallParticipant[];
};

export type SocialCallResponse = {
  call: SocialCall;
  iceServers: IceServer[];
};

export type SocialCallHistoryResponse = {
  data: SocialCall[];
  nextCursor: string | null;
};
