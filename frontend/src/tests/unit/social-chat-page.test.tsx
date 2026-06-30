import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SocialChatPage } from "@/features/social/SocialChatPage";
import type { MangaSummary, SocialConversation, SocialMessage, User } from "@/types";

type SocketHandler = (payload?: unknown, ack?: (result: unknown) => void) => void;

const mocks = vi.hoisted(() => ({
  listSocialConversations: vi.fn(),
  listSocialMessages: vi.fn(),
  listFriends: vi.fn(),
  listIncomingFriendRequests: vi.fn(),
  listSentFriendRequests: vi.fn(),
  searchSocialUsers: vi.fn(),
  searchManga: vi.fn(),
  createSocialGroupConversation: vi.fn(),
  createSocialGroupInvite: vi.fn(),
  resolveSocialGroupInvite: vi.fn(),
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  rejectFriendRequest: vi.fn(),
  blockFriendship: vi.fn(),
  unfriend: vi.fn(),
  sendSocialMessage: vi.fn(),
  deleteSocialMessage: vi.fn(),
  markSocialConversationRead: vi.fn(),
  showToast: vi.fn(),
  socketHandlers: new Map<string, SocketHandler>(),
  socketEmit: vi.fn(),
  socketDisconnect: vi.fn()
}));

vi.mock("@/api", () => ({
  assetUrl: (url: string | undefined) => url,
  api: {
    listSocialConversations: mocks.listSocialConversations,
    listSocialMessages: mocks.listSocialMessages,
    listFriends: mocks.listFriends,
    listIncomingFriendRequests: mocks.listIncomingFriendRequests,
    listSentFriendRequests: mocks.listSentFriendRequests,
    searchSocialUsers: mocks.searchSocialUsers,
    searchManga: mocks.searchManga,
    createSocialGroupConversation: mocks.createSocialGroupConversation,
    createSocialGroupInvite: mocks.createSocialGroupInvite,
    resolveSocialGroupInvite: mocks.resolveSocialGroupInvite,
    sendFriendRequest: mocks.sendFriendRequest,
    acceptFriendRequest: mocks.acceptFriendRequest,
    rejectFriendRequest: mocks.rejectFriendRequest,
    blockFriendship: mocks.blockFriendship,
    unfriend: mocks.unfriend,
    sendSocialMessage: mocks.sendSocialMessage,
    deleteSocialMessage: mocks.deleteSocialMessage,
    markSocialConversationRead: mocks.markSocialConversationRead
  }
}));

vi.mock("@/features/auth/stores/auth.store", () => ({
  useAuth: () => ({ user: currentUser })
}));

vi.mock("@/stores/toast.store", () => ({
  useToast: () => ({ showToast: mocks.showToast })
}));

vi.mock("@/features/social/social-socket", () => ({
  createSocialSocket: () => ({
    on: (event: string, handler: SocketHandler) => {
      mocks.socketHandlers.set(event, handler);
    },
    emit: mocks.socketEmit,
    disconnect: mocks.socketDisconnect
  })
}));

describe("SocialChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.socketHandlers.clear();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");

    mocks.socketEmit.mockImplementation((event: string, _payload: unknown, ack?: (result: unknown) => void) => {
      if (event === "message:read") ack?.({ ok: false, error: { code: "SOCKET_READ_FAILED", message: "read failed" } });
    });
    mocks.markSocialConversationRead.mockResolvedValue({ readState: { conversationId: "conv-1", userId: currentUser.id, lastReadMessageId: "message-2", lastReadAt: now } });
    mocks.listSocialConversations.mockImplementation((params?: { membershipStatus?: string }) =>
      Promise.resolve(params?.membershipStatus === "PENDING_INVITE" ? { data: [], nextCursor: null } : { data: [conversation], nextCursor: null })
    );
    mocks.listSocialMessages.mockResolvedValue({ data: [peerMessage, ownMessage], nextCursor: null });
    mocks.listFriends.mockResolvedValue({ data: [friendship] });
    mocks.listIncomingFriendRequests.mockResolvedValue({ data: [incomingFriendship] });
    mocks.listSentFriendRequests.mockResolvedValue({ data: [sentFriendship] });
    mocks.searchSocialUsers.mockResolvedValue({ data: [searchResult] });
    mocks.searchManga.mockResolvedValue({ data: [mangaResult], limit: 8, offset: 0, total: 1 });
    mocks.createSocialGroupConversation.mockResolvedValue({ conversation: groupConversation });
    mocks.createSocialGroupInvite.mockResolvedValue({ conversation: groupConversationWithPendingInvite });
    mocks.resolveSocialGroupInvite.mockResolvedValue({ conversation: groupConversation });
    mocks.sendFriendRequest.mockResolvedValue({ friendship: sentFriendship });
    mocks.acceptFriendRequest.mockResolvedValue({ friendship: acceptedFriendship, conversation });
    mocks.rejectFriendRequest.mockResolvedValue({ friendship: incomingFriendship });
    mocks.blockFriendship.mockResolvedValue({ friendship });
    mocks.unfriend.mockResolvedValue({ friendship });
    mocks.sendSocialMessage.mockResolvedValue({ message: sentMessage, idempotent: false });
    mocks.deleteSocialMessage.mockResolvedValue({ message: deletedOwnMessage, idempotent: false });
  });

  it("renders the inbox and marks the latest peer message as read with REST fallback", async () => {
    renderWithClient(<SocialChatPage />);

    expect(await screen.findAllByText("Mina")).toHaveLength(3);
    expect(screen.getAllByText("See you at chapter 12")).toHaveLength(2);
    expect(screen.getByText("I am caught up")).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.socketEmit).toHaveBeenCalledWith("message:read", { conversationId: "conv-1", lastMessageId: "message-2" }, expect.any(Function));
      expect(mocks.markSocialConversationRead).toHaveBeenCalledWith("conv-1", "message-2");
    });
  });

  it("sends an optimistic text message and reconciles the committed message", async () => {
    const user = userEvent.setup();
    let resolveSend: ((value: { message: SocialMessage; idempotent: boolean }) => void) | undefined;
    mocks.sendSocialMessage.mockReturnValue(
      new Promise((resolve) => {
        resolveSend = resolve;
      })
    );

    renderWithClient(<SocialChatPage />);

    await screen.findByText("See you at chapter 12");
    await user.type(screen.getByLabelText("Message"), "New realtime note");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.getByText("New realtime note")).toBeInTheDocument();
    expect(screen.getByText("Sending")).toBeInTheDocument();
    expect(mocks.sendSocialMessage).toHaveBeenCalledWith("conv-1", { clientMessageId: "00000000-0000-4000-8000-000000000001", content: "New realtime note" });
    expect(mocks.socketEmit).toHaveBeenCalledWith("typing:stop", { conversationId: "conv-1" });

    resolveSend?.({ message: sentMessage, idempotent: false });

    expect(await screen.findByText("Committed realtime note")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Sending")).not.toBeInTheDocument());
  });

  it("removes pending messages when the socket delivers the committed message first", async () => {
    const user = userEvent.setup();
    mocks.sendSocialMessage.mockResolvedValue({ message: sentMessage, idempotent: false });

    renderWithClient(<SocialChatPage />);

    await screen.findByText("See you at chapter 12");
    await user.type(screen.getByLabelText("Message"), "New realtime note");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    mocks.socketHandlers.get("message:new")?.({ conversationId: "conv-1", message: sentMessage });

    await waitFor(() => expect(screen.getAllByText("Committed realtime note")).toHaveLength(1));
    expect(screen.queryByText("Sending")).not.toBeInTheDocument();
  });

  it("keeps multiple group typing indicators visible independently", async () => {
    renderWithClient(<SocialChatPage />);

    await screen.findByText("See you at chapter 12");
    const typingHandler = mocks.socketHandlers.get("typing:indicator");

    act(() => {
      typingHandler?.({ conversationId: "conv-1", user: peer, typing: true });
      typingHandler?.({ conversationId: "conv-1", user: groupPeer, typing: true });
    });

    expect(await screen.findAllByText("Mina and Yui are typing")).toHaveLength(2);

    act(() => {
      typingHandler?.({ conversationId: "conv-1", user: peer, typing: false });
    });

    expect(await screen.findAllByText("Yui is typing")).toHaveLength(2);
    expect(screen.queryByText("Mina and Yui are typing")).not.toBeInTheDocument();
  });

  it("shares a manga into the selected conversation", async () => {
    const user = userEvent.setup();
    mocks.sendSocialMessage.mockResolvedValue({ message: sharedMangaMessage, idempotent: false });

    renderWithClient(<SocialChatPage />);

    await screen.findByText("See you at chapter 12");
    await user.click(screen.getByRole("button", { name: "Share manga" }));
    await user.click(await screen.findByRole("button", { name: "Share Chainsaw Man" }));

    expect(mocks.searchManga).toHaveBeenCalledWith(expect.objectContaining({ limit: 8 }));
    expect(mocks.sendSocialMessage).toHaveBeenCalledWith("conv-1", {
      clientMessageId: "00000000-0000-4000-8000-000000000001",
      type: "MANGA_SHARE",
      mangaId: "manga-1"
    });
    expect(await screen.findByText("Chainsaw Man")).toBeInTheDocument();
    expect(screen.getByText("Manga share")).toBeInTheDocument();
  });

  it("soft-deletes the current user's message", async () => {
    const user = userEvent.setup();
    renderWithClient(<SocialChatPage />);

    await screen.findByText("I am caught up");
    await user.click(screen.getByRole("button", { name: "Delete message" }));

    await waitFor(() => expect(mocks.deleteSocialMessage).toHaveBeenCalledWith("message-1"));
    expect(await screen.findByText("Deleted message")).toBeInTheDocument();
  });

  it("manages friendship requests and opens a friend DM", async () => {
    const user = userEvent.setup();
    renderWithClient(<SocialChatPage />);

    await screen.findAllByText("Mina");
    expect(await screen.findByText("Incoming")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();

    expect(await screen.findByText("Kira")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search readers"), "kir");
    await user.click(screen.getByRole("button", { name: "Kira" }));
    await user.click(screen.getByRole("button", { name: "Send friend request" }));
    expect(mocks.sendFriendRequest).toHaveBeenCalledWith("user-5");

    await user.click(screen.getByRole("button", { name: "Accept request" }));
    await waitFor(() => expect(mocks.acceptFriendRequest).toHaveBeenCalledWith("friendship-incoming"));

    await user.click(screen.getByRole("button", { name: "Open direct message" }));
    expect(await screen.findByRole("heading", { name: "Mina" })).toBeInTheDocument();
  });

  it("creates a group conversation from accepted friends", async () => {
    const user = userEvent.setup();
    mocks.listFriends.mockResolvedValue({ data: [friendship, groupFriendship] });

    renderWithClient(<SocialChatPage />);

    await screen.findByText("See you at chapter 12");
    await user.click(screen.getByRole("button", { name: "Create group" }));
    const dialog = screen.getByRole("dialog", { name: "Create group chat" });
    await user.type(within(dialog).getByLabelText("Group name"), "Manga Club");
    await user.click(within(dialog).getByRole("button", { name: "Select Mina" }));
    await user.click(within(dialog).getByRole("button", { name: "Select Yui" }));
    await user.click(within(dialog).getByRole("button", { name: "Create group" }));

    await waitFor(() =>
      expect(mocks.createSocialGroupConversation).toHaveBeenCalledWith({
        title: "Manga Club",
        memberIds: ["user-2", "user-6"]
      })
    );
    expect(await screen.findByRole("heading", { name: "Manga Club" })).toBeInTheDocument();
    expect(screen.getByText("3 members")).toBeInTheDocument();
  });

  it("accepts an incoming group invite from the sidebar", async () => {
    const user = userEvent.setup();
    mocks.listSocialConversations.mockImplementation((params?: { membershipStatus?: string }) =>
      Promise.resolve(params?.membershipStatus === "PENDING_INVITE" ? { data: [pendingInviteConversation], nextCursor: null } : { data: [conversation], nextCursor: null })
    );
    mocks.resolveSocialGroupInvite.mockResolvedValue({ conversation: groupConversation });

    renderWithClient(<SocialChatPage />);

    await screen.findByText("Manga Club");
    await user.click(screen.getByRole("button", { name: "Accept invite to Manga Club" }));

    await waitFor(() =>
      expect(mocks.resolveSocialGroupInvite).toHaveBeenCalledWith("group-1", currentUser.id, "accept")
    );
    expect(await screen.findByRole("heading", { name: "Manga Club" })).toBeInTheDocument();
  });

  it("invites an accepted friend from a group thread", async () => {
    const user = userEvent.setup();
    mocks.listSocialConversations.mockImplementation((params?: { membershipStatus?: string }) =>
      Promise.resolve(params?.membershipStatus === "PENDING_INVITE" ? { data: [], nextCursor: null } : { data: [groupConversation], nextCursor: null })
    );
    mocks.listFriends.mockResolvedValue({ data: [friendship, groupFriendship, inviteFriendship] });
    mocks.createSocialGroupInvite.mockResolvedValue({ conversation: groupConversationWithPendingInvite });

    renderWithClient(<SocialChatPage />);

    await screen.findByRole("heading", { name: "Manga Club" });
    await user.click(screen.getByRole("button", { name: "Invite member" }));
    const dialog = screen.getByRole("dialog", { name: "Invite group member" });
    await user.click(within(dialog).getByRole("button", { name: "Invite Kira" }));
    await user.click(within(dialog).getByRole("button", { name: "Send invite" }));

    await waitFor(() =>
      expect(mocks.createSocialGroupInvite).toHaveBeenCalledWith("group-1", "user-5")
    );
    expect(await screen.findByRole("button", { name: "Cancel invite for Kira" })).toBeInTheDocument();
  });
});

const now = "2026-06-28T09:00:00.000Z";

const currentUser: User = {
  id: "user-1",
  email: "reader@example.com",
  displayName: "Reader",
  role: "USER",
  avatarUrl: null,
  emailVerifiedAt: "2026-06-28T00:00:00.000Z",
  createdAt: "2026-06-28T00:00:00.000Z"
};

const peer = {
  id: "user-2",
  displayName: "Mina",
  avatarUrl: null
};

const requester = {
  id: "user-3",
  displayName: "Nori",
  avatarUrl: null
};

const pendingPeer = {
  id: "user-4",
  displayName: "Aya",
  avatarUrl: null
};

const searchResult = {
  id: "user-5",
  displayName: "Kira",
  avatarUrl: null
};

const groupPeer = {
  id: "user-6",
  displayName: "Yui",
  avatarUrl: null
};

const mangaResult: MangaSummary = {
  id: "manga-1",
  title: "Chainsaw Man",
  altTitles: [],
  description: "Devils and contracts.",
  status: "ongoing",
  year: 2024,
  contentRating: "safe",
  tags: ["Action", "Drama"],
  coverUrl: "/api/covers/manga-1/cover.jpg"
};

const ownMessage: SocialMessage = {
  id: "message-1",
  conversationId: "conv-1",
  senderId: currentUser.id,
  clientMessageId: null,
  type: "TEXT",
  content: "I am caught up",
  attachments: null,
  replyToId: null,
  deletedAt: null,
  createdAt: "2026-06-28T08:59:00.000Z",
  updatedAt: "2026-06-28T08:59:00.000Z",
  sender: currentUser
};

const peerMessage: SocialMessage = {
  id: "message-2",
  conversationId: "conv-1",
  senderId: peer.id,
  clientMessageId: null,
  type: "TEXT",
  content: "See you at chapter 12",
  attachments: null,
  replyToId: null,
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
  sender: peer
};

const sentMessage: SocialMessage = {
  id: "message-3",
  conversationId: "conv-1",
  senderId: currentUser.id,
  clientMessageId: "00000000-0000-4000-8000-000000000001",
  type: "TEXT",
  content: "Committed realtime note",
  attachments: null,
  replyToId: null,
  deletedAt: null,
  createdAt: "2026-06-28T09:01:00.000Z",
  updatedAt: "2026-06-28T09:01:00.000Z",
  sender: currentUser
};

const sharedMangaMessage: SocialMessage = {
  id: "message-4",
  conversationId: "conv-1",
  senderId: currentUser.id,
  clientMessageId: "00000000-0000-4000-8000-000000000001",
  type: "MANGA_SHARE",
  content: null,
  attachments: {
    kind: "MANGA_SHARE",
    manga: {
      id: mangaResult.id,
      title: mangaResult.title,
      coverUrl: mangaResult.coverUrl,
      status: mangaResult.status,
      year: mangaResult.year,
      contentRating: mangaResult.contentRating,
      tags: mangaResult.tags
    },
    chapter: null
  },
  replyToId: null,
  deletedAt: null,
  createdAt: "2026-06-28T09:03:00.000Z",
  updatedAt: "2026-06-28T09:03:00.000Z",
  sender: currentUser
};

const deletedOwnMessage: SocialMessage = {
  ...ownMessage,
  content: null,
  deletedAt: "2026-06-28T09:02:00.000Z",
  updatedAt: "2026-06-28T09:02:00.000Z"
};

const conversation: SocialConversation = {
  id: "conv-1",
  type: "DM",
  title: null,
  avatarUrl: null,
  directKey: "user-1:user-2",
  lastMessageAt: now,
  createdAt: "2026-06-28T08:00:00.000Z",
  updatedAt: now,
  currentMember: {
    id: "member-1",
    role: "MEMBER",
    status: "ACTIVE",
    lastReadMessageId: "message-1",
    lastReadAt: "2026-06-28T08:59:30.000Z",
    mutedUntil: null,
    joinedAt: "2026-06-28T08:00:00.000Z"
  },
  members: [
    {
      id: "member-1",
      userId: currentUser.id,
      role: "MEMBER",
      status: "ACTIVE",
      joinedAt: "2026-06-28T08:00:00.000Z",
      user: currentUser
    },
    {
      id: "member-2",
      userId: peer.id,
      role: "MEMBER",
      status: "ACTIVE",
      joinedAt: "2026-06-28T08:00:00.000Z",
      user: peer
    }
  ],
  latestMessage: {
    id: peerMessage.id,
    conversationId: peerMessage.conversationId,
    senderId: peerMessage.senderId,
    type: peerMessage.type,
    content: peerMessage.content,
    attachments: peerMessage.attachments,
    deletedAt: peerMessage.deletedAt,
    createdAt: peerMessage.createdAt,
    sender: peerMessage.sender
  }
};

const groupConversation: SocialConversation = {
  id: "group-1",
  type: "GROUP",
  title: "Manga Club",
  avatarUrl: null,
  directKey: null,
  lastMessageAt: null,
  createdAt: "2026-06-28T09:10:00.000Z",
  updatedAt: "2026-06-28T09:10:00.000Z",
  currentMember: {
    id: "group-member-1",
    role: "OWNER",
    status: "ACTIVE",
    lastReadMessageId: null,
    lastReadAt: null,
    mutedUntil: null,
    joinedAt: "2026-06-28T09:10:00.000Z"
  },
  members: [
    {
      id: "group-member-1",
      userId: currentUser.id,
      role: "OWNER",
      status: "ACTIVE",
      joinedAt: "2026-06-28T09:10:00.000Z",
      user: currentUser
    },
    {
      id: "group-member-2",
      userId: peer.id,
      role: "MEMBER",
      status: "ACTIVE",
      joinedAt: "2026-06-28T09:10:00.000Z",
      user: peer
    },
    {
      id: "group-member-3",
      userId: groupPeer.id,
      role: "MEMBER",
      status: "ACTIVE",
      joinedAt: "2026-06-28T09:10:00.000Z",
      user: groupPeer
    }
  ],
  latestMessage: null
};

const pendingInviteConversation: SocialConversation = {
  ...groupConversation,
  currentMember: {
    id: "group-member-1",
    role: "MEMBER",
    status: "PENDING_INVITE",
    lastReadMessageId: null,
    lastReadAt: null,
    mutedUntil: null,
    joinedAt: "2026-06-28T09:10:00.000Z"
  },
  members: groupConversation.members.map((member) =>
    member.userId === currentUser.id ? { ...member, role: "MEMBER" as const, status: "PENDING_INVITE" as const } : member
  )
};

const groupConversationWithPendingInvite: SocialConversation = {
  ...groupConversation,
  members: [
    ...groupConversation.members,
    {
      id: "group-member-4",
      userId: searchResult.id,
      role: "MEMBER",
      status: "PENDING_INVITE",
      joinedAt: "2026-06-28T09:12:00.000Z",
      user: searchResult
    }
  ]
};

const friendship = {
  id: "friendship-1",
  userAId: currentUser.id,
  userBId: peer.id,
  requestedById: currentUser.id,
  blockedById: null,
  status: "ACCEPTED" as const,
  createdAt: "2026-06-28T08:00:00.000Z",
  updatedAt: "2026-06-28T08:00:00.000Z",
  friend: peer
};

const incomingFriendship = {
  id: "friendship-incoming",
  userAId: currentUser.id,
  userBId: requester.id,
  requestedById: requester.id,
  blockedById: null,
  status: "PENDING" as const,
  createdAt: "2026-06-28T08:10:00.000Z",
  updatedAt: "2026-06-28T08:10:00.000Z",
  friend: requester
};

const sentFriendship = {
  id: "friendship-sent",
  userAId: currentUser.id,
  userBId: pendingPeer.id,
  requestedById: currentUser.id,
  blockedById: null,
  status: "PENDING" as const,
  createdAt: "2026-06-28T08:20:00.000Z",
  updatedAt: "2026-06-28T08:20:00.000Z",
  friend: pendingPeer
};

const groupFriendship = {
  id: "friendship-group",
  userAId: currentUser.id,
  userBId: groupPeer.id,
  requestedById: currentUser.id,
  blockedById: null,
  status: "ACCEPTED" as const,
  createdAt: "2026-06-28T08:25:00.000Z",
  updatedAt: "2026-06-28T08:25:00.000Z",
  friend: groupPeer
};

const inviteFriendship = {
  id: "friendship-invite",
  userAId: currentUser.id,
  userBId: searchResult.id,
  requestedById: currentUser.id,
  blockedById: null,
  status: "ACCEPTED" as const,
  createdAt: "2026-06-28T08:35:00.000Z",
  updatedAt: "2026-06-28T08:35:00.000Z",
  friend: searchResult
};

const acceptedFriendship = {
  ...incomingFriendship,
  status: "ACCEPTED" as const,
  updatedAt: "2026-06-28T08:30:00.000Z"
};

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}
