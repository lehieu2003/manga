import 'package:manga_mobile/data/repositories/repositories.dart';
import 'package:manga_mobile/domain/models/models.dart';

import '../helpers/test_app.dart';

class FakeSocialRepository extends SocialRepository {
  FakeSocialRepository(super.api);

  final users = const [
    SocialUser(id: 'user-2', displayName: 'Mina'),
    SocialUser(id: 'user-3', displayName: 'Nori'),
    SocialUser(id: 'user-4', displayName: 'Kira'),
    SocialUser(id: 'user-5', displayName: 'Yui'),
  ];

  final List<String> sentRequests = [];
  final List<String> acceptedRequests = [];
  final List<(String, List<String>)> createdGroups = [];
  final List<(String, String)> createdInvites = [];
  final List<(String, String, String)> resolvedInvites = [];
  final List<(String, String)> startedCalls = [];
  final List<String> joinedCalls = [];
  final List<String> declinedCalls = [];
  final List<String> leftCalls = [];

  late List<Friendship> friends = [
    Friendship(
      id: 'friendship-1',
      userAId: 'user-1',
      userBId: 'user-2',
      requestedById: 'user-1',
      status: 'ACCEPTED',
      createdAt: testNow,
      updatedAt: testNow,
      friend: users[0],
    ),
    Friendship(
      id: 'friendship-3',
      userAId: 'user-1',
      userBId: 'user-5',
      requestedById: 'user-1',
      status: 'ACCEPTED',
      createdAt: testNow,
      updatedAt: testNow,
      friend: users[3],
    ),
  ];

  late List<Friendship> incoming = [
    Friendship(
      id: 'friendship-2',
      userAId: 'user-1',
      userBId: 'user-3',
      requestedById: 'user-3',
      status: 'PENDING',
      createdAt: testNow,
      updatedAt: testNow,
      friend: users[1],
    ),
  ];

  late List<Friendship> sent = [];

  late List<SocialConversation> conversations = [
    SocialConversation(
      id: 'conversation-1',
      type: 'DM',
      directKey: 'user-1:user-2',
      createdAt: testNow,
      updatedAt: testNow,
      lastMessageAt: testNow,
      members: [
        SocialMember(
          id: 'member-1',
          userId: 'user-1',
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: testNow,
          user: const SocialUser(id: 'user-1', displayName: 'Reader'),
        ),
        SocialMember(
          id: 'member-2',
          userId: 'user-2',
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: testNow,
          user: users[0],
        ),
      ],
      latestMessage: SocialMessage(
        id: 'message-1',
        conversationId: 'conversation-1',
        senderId: 'user-2',
        type: 'TEXT',
        content: 'See you at chapter 12',
        createdAt: testNow,
        updatedAt: testNow,
        sender: users[0],
      ),
    ),
  ];

  late List<SocialConversation> pendingInvites = [
    SocialConversation(
      id: 'invite-1',
      type: 'GROUP',
      title: 'Pending Club',
      createdAt: testNow,
      updatedAt: testNow,
      currentMember: SocialCurrentMember(
        id: 'group-member-1',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: testNow,
      ),
      members: [
        SocialMember(
          id: 'invite-member-1',
          userId: 'user-1',
          role: 'MEMBER',
          status: 'PENDING_INVITE',
          joinedAt: testNow,
          user: const SocialUser(id: 'user-1', displayName: 'Reader'),
        ),
        SocialMember(
          id: 'invite-member-2',
          userId: 'user-2',
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: testNow,
          user: users[0],
        ),
      ],
    ),
  ];

  late List<SocialMessage> messages = [
    SocialMessage(
      id: 'message-2',
      conversationId: 'conversation-1',
      senderId: 'user-1',
      type: 'TEXT',
      content: 'I am caught up',
      createdAt: testNow.add(const Duration(minutes: 1)),
      updatedAt: testNow.add(const Duration(minutes: 1)),
      sender: const SocialUser(id: 'user-1', displayName: 'Reader'),
    ),
    SocialMessage(
      id: 'message-1',
      conversationId: 'conversation-1',
      senderId: 'user-2',
      type: 'TEXT',
      content: 'See you at chapter 12',
      createdAt: testNow,
      updatedAt: testNow,
      sender: users[0],
    ),
  ];

  SocialMessage pushPeerMessage(String content) {
    final message = SocialMessage(
      id: 'message-${messages.length + 1}',
      conversationId: 'conversation-1',
      senderId: 'user-2',
      type: 'TEXT',
      content: content,
      createdAt: testNow.add(Duration(minutes: messages.length + 1)),
      updatedAt: testNow.add(Duration(minutes: messages.length + 1)),
      sender: users[0],
    );
    messages = [message, ...messages];
    return message;
  }

  @override
  Future<SocialUserSearchResponse> searchUsers({
    String? query,
    int limit = 12,
  }) async {
    final needle = query?.toLowerCase() ?? '';
    return SocialUserSearchResponse(
      data: users
          .where((user) => user.displayName.toLowerCase().contains(needle))
          .toList(),
    );
  }

  @override
  Future<FriendshipListResponse> listFriends() async =>
      FriendshipListResponse(data: friends);

  @override
  Future<FriendshipListResponse> listIncomingRequests() async =>
      FriendshipListResponse(data: incoming);

  @override
  Future<FriendshipListResponse> listSentRequests() async =>
      FriendshipListResponse(data: sent);

  @override
  Future<Friendship> sendFriendRequest(String addresseeId) async {
    sentRequests.add(addresseeId);
    final user = users.firstWhere((item) => item.id == addresseeId);
    final friendship = Friendship(
      id: 'friendship-sent',
      userAId: 'user-1',
      userBId: addresseeId,
      requestedById: 'user-1',
      status: 'PENDING',
      createdAt: testNow,
      updatedAt: testNow,
      friend: user,
    );
    sent = [friendship];
    return friendship;
  }

  @override
  Future<(Friendship, SocialConversation)> acceptFriendRequest(
    String friendshipId,
  ) async {
    acceptedRequests.add(friendshipId);
    final friendship = incoming.firstWhere((item) => item.id == friendshipId);
    incoming = [];
    friends = [...friends, friendship];
    return (friendship, conversations.first);
  }

  @override
  Future<Friendship> rejectFriendRequest(String friendshipId) async {
    final friendship = incoming.firstWhere((item) => item.id == friendshipId);
    incoming = incoming.where((item) => item.id != friendshipId).toList();
    return friendship;
  }

  @override
  Future<Friendship> blockFriendship(String friendshipId) async =>
      friends.firstWhere((item) => item.id == friendshipId);

  @override
  Future<Friendship> unfriend(String friendshipId) async {
    final friendship = friends.firstWhere((item) => item.id == friendshipId);
    friends = friends.where((item) => item.id != friendshipId).toList();
    return friendship;
  }

  @override
  Future<SocialConversationListResponse> listConversations({
    int limit = 30,
    String? cursor,
    String? membershipStatus,
  }) async => SocialConversationListResponse(
    data: membershipStatus == 'PENDING_INVITE' ? pendingInvites : conversations,
  );

  @override
  Future<SocialConversation> createGroupConversation({
    required String title,
    required List<String> memberIds,
  }) async {
    createdGroups.add((title, memberIds));
    final selectedUsers = memberIds
        .map((id) => users.firstWhere((user) => user.id == id))
        .toList();
    final conversation = SocialConversation(
      id: 'group-${conversations.length + 1}',
      type: 'GROUP',
      title: title,
      createdAt: testNow,
      updatedAt: testNow,
      members: [
        SocialMember(
          id: 'group-member-1',
          userId: 'user-1',
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: testNow,
          user: const SocialUser(id: 'user-1', displayName: 'Reader'),
        ),
        ...selectedUsers.indexed.map(
          (entry) => SocialMember(
            id: 'group-member-${entry.$1 + 2}',
            userId: entry.$2.id,
            role: 'MEMBER',
            status: 'ACTIVE',
            joinedAt: testNow,
            user: entry.$2,
          ),
        ),
      ],
    );
    conversations = [conversation, ...conversations];
    return conversation;
  }

  @override
  Future<SocialConversation> createGroupInvite({
    required String conversationId,
    required String userId,
  }) async {
    createdInvites.add((conversationId, userId));
    final conversation = conversations.firstWhere(
      (item) => item.id == conversationId,
    );
    final user = users.firstWhere((item) => item.id == userId);
    final updated = SocialConversation(
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      avatarUrl: conversation.avatarUrl,
      directKey: conversation.directKey,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      updatedAt: testNow,
      currentMember: conversation.currentMember,
      latestMessage: conversation.latestMessage,
      members: [
        ...conversation.members,
        SocialMember(
          id: 'pending-member-$userId',
          userId: userId,
          role: 'MEMBER',
          status: 'PENDING_INVITE',
          joinedAt: testNow,
          user: user,
        ),
      ],
    );
    conversations = [
      updated,
      ...conversations.where((item) => item.id != conversationId),
    ];
    return updated;
  }

  @override
  Future<SocialConversation> resolveGroupInvite({
    required String conversationId,
    required String userId,
    required String action,
  }) async {
    resolvedInvites.add((conversationId, userId, action));
    final invite = pendingInvites.firstWhere(
      (item) => item.id == conversationId,
      orElse: () =>
          conversations.firstWhere((item) => item.id == conversationId),
    );
    pendingInvites = pendingInvites
        .where((item) => item.id != conversationId)
        .toList();
    if (action == 'accept') {
      final accepted = SocialConversation(
        id: invite.id,
        type: invite.type,
        title: invite.title,
        avatarUrl: invite.avatarUrl,
        directKey: invite.directKey,
        lastMessageAt: invite.lastMessageAt,
        createdAt: invite.createdAt,
        updatedAt: testNow,
        currentMember: SocialCurrentMember(
          id: 'invite-member-1',
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: testNow,
        ),
        latestMessage: invite.latestMessage,
        members: invite.members
            .map(
              (member) => member.userId == userId
                  ? SocialMember(
                      id: member.id,
                      userId: member.userId,
                      role: member.role,
                      status: 'ACTIVE',
                      joinedAt: testNow,
                      user: member.user,
                    )
                  : member,
            )
            .toList(),
      );
      conversations = [accepted, ...conversations];
      return accepted;
    }
    return invite;
  }

  @override
  Future<SocialMessageListResponse> listMessages(
    String conversationId, {
    int limit = 50,
    String? cursor,
  }) async => SocialMessageListResponse(
    data: conversationId == 'conversation-1' ? messages : const [],
  );

  @override
  Future<SocialMessage> sendMessage({
    required String conversationId,
    required String clientMessageId,
    required String content,
  }) async {
    final message = SocialMessage(
      id: 'message-${messages.length + 1}',
      conversationId: conversationId,
      senderId: 'user-1',
      clientMessageId: clientMessageId,
      type: 'TEXT',
      content: content,
      createdAt: testNow.add(Duration(minutes: messages.length + 1)),
      updatedAt: testNow.add(Duration(minutes: messages.length + 1)),
      sender: const SocialUser(id: 'user-1', displayName: 'Reader'),
    );
    messages = [message, ...messages];
    return message;
  }

  @override
  Future<SocialMessage> sendMangaShare({
    required String conversationId,
    required String clientMessageId,
    required String mangaId,
    String? chapterId,
  }) async {
    final manga = testManga.firstWhere((item) => item.id == mangaId);
    final message = SocialMessage(
      id: 'message-${messages.length + 1}',
      conversationId: conversationId,
      senderId: 'user-1',
      clientMessageId: clientMessageId,
      type: 'MANGA_SHARE',
      createdAt: testNow.add(Duration(minutes: messages.length + 1)),
      updatedAt: testNow.add(Duration(minutes: messages.length + 1)),
      sender: const SocialUser(id: 'user-1', displayName: 'Reader'),
      mangaShare: MangaShareAttachment(
        manga: MangaShareManga(
          id: manga.id,
          title: manga.title,
          coverUrl: manga.coverUrl,
          status: manga.status,
          year: manga.year,
          contentRating: manga.contentRating,
          tags: manga.tags,
        ),
      ),
    );
    messages = [message, ...messages];
    return message;
  }

  @override
  Future<void> markConversationRead(
    String conversationId,
    String lastMessageId,
  ) async {}

  @override
  Future<SocialCallResponse> startCall({
    required String conversationId,
    required String mediaType,
  }) async {
    startedCalls.add((conversationId, mediaType));
    return SocialCallResponse(
      call: testCall(
        id: 'call-${startedCalls.length}',
        conversationId: conversationId,
        initiatorId: 'user-1',
        mediaType: mediaType,
      ),
      iceServers: const [],
    );
  }

  @override
  Future<SocialCallResponse> joinCall(String callId) async {
    joinedCalls.add(callId);
    return SocialCallResponse(
      call: testCall(id: callId, initiatorId: 'user-2', joined: true),
      iceServers: const [],
    );
  }

  @override
  Future<SocialCall> declineCall(String callId) async {
    declinedCalls.add(callId);
    return testCall(id: callId, initiatorId: 'user-2', status: 'DECLINED');
  }

  @override
  Future<SocialCall> leaveCall(String callId) async {
    leftCalls.add(callId);
    return testCall(id: callId, status: 'ENDED');
  }
}
