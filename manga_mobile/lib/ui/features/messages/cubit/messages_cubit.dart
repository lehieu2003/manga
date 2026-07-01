import 'dart:async';
import 'dart:math';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../data/repositories/repositories.dart';
import '../../../../data/services/social_socket_service.dart';
import '../../../../domain/models/models.dart';
import 'messages_state.dart';

class MessagesCubit extends Cubit<MessagesState> {
  MessagesCubit({
    required this.socialRepository,
    required this.socialSocketService,
    required this.currentUserId,
  }) : super(MessagesState.initial()) {
    _bindSocket();
  }

  final SocialRepository socialRepository;
  final SocialSocketService socialSocketService;
  final String currentUserId;
  final List<StreamSubscription<dynamic>> _socketSubscriptions = [];
  Timer? _typingStopTimer;
  final Map<String, Timer> _typingClearTimers = {};

  Future<void> load() async {
    emit(
      state.copyWith(
        loading: true,
        friendshipLoading: true,
        error: null,
        notice: null,
      ),
    );

    try {
      final results = await Future.wait<Object>([
        socialRepository.listConversations(),
        socialRepository.listConversations(membershipStatus: 'PENDING_INVITE'),
        socialRepository.listFriends(),
        socialRepository.listIncomingRequests(),
        socialRepository.listSentRequests(),
        socialRepository.searchUsers(limit: 8),
      ]);
      final conversations = (results[0] as SocialConversationListResponse).data;
      final selectedId =
          state.selectedConversationId ?? conversations.firstOrNull?.id;

      emit(
        state.copyWith(
          conversations: conversations,
          pendingInvites: (results[1] as SocialConversationListResponse).data,
          friends: (results[2] as FriendshipListResponse).data,
          incomingRequests: (results[3] as FriendshipListResponse).data,
          sentRequests: (results[4] as FriendshipListResponse).data,
          userResults: (results[5] as SocialUserSearchResponse).data,
          selectedConversationId: selectedId,
          loading: false,
          friendshipLoading: false,
          error: null,
        ),
      );

      await socialSocketService.connect();
      if (selectedId != null) await selectConversation(selectedId);
    } catch (error) {
      emit(
        state.copyWith(
          loading: false,
          friendshipLoading: false,
          error: error.toString(),
        ),
      );
    }
  }

  Future<void> refreshFriendships() async {
    emit(state.copyWith(friendshipLoading: true, notice: null));
    try {
      final results = await Future.wait<Object>([
        socialRepository.listFriends(),
        socialRepository.listIncomingRequests(),
        socialRepository.listSentRequests(),
      ]);
      emit(
        state.copyWith(
          friends: (results[0] as FriendshipListResponse).data,
          incomingRequests: (results[1] as FriendshipListResponse).data,
          sentRequests: (results[2] as FriendshipListResponse).data,
          friendshipLoading: false,
          error: null,
        ),
      );
    } catch (error) {
      emit(state.copyWith(friendshipLoading: false, notice: error.toString()));
    }
  }

  Future<void> searchUsers(String query) async {
    emit(state.copyWith(searchQuery: query));
    try {
      final results = await socialRepository.searchUsers(
        query: query.trim().isEmpty ? null : query.trim(),
        limit: 8,
      );
      emit(state.copyWith(userResults: results.data, error: null));
    } catch (error) {
      emit(state.copyWith(notice: error.toString()));
    }
  }

  Future<void> sendFriendRequest(String userId) async {
    try {
      await socialRepository.sendFriendRequest(userId);
      emit(
        state.copyWith(
          searchQuery: '',
          userResults: const [],
          notice: 'Friend request sent.',
        ),
      );
      await refreshFriendships();
    } catch (error) {
      emit(state.copyWith(notice: error.toString()));
    }
  }

  Future<void> acceptFriendRequest(String friendshipId) async {
    try {
      final result = await socialRepository.acceptFriendRequest(friendshipId);
      final conversation = result.$2;
      await refreshConversations(selectedConversationId: conversation.id);
      await refreshFriendships();
      emit(state.copyWith(notice: 'Friend request accepted.'));
    } catch (error) {
      emit(state.copyWith(notice: error.toString()));
    }
  }

  Future<void> rejectFriendRequest(String friendshipId) async {
    try {
      await socialRepository.rejectFriendRequest(friendshipId);
      await refreshFriendships();
      emit(state.copyWith(notice: 'Friend request rejected.'));
    } catch (error) {
      emit(state.copyWith(notice: error.toString()));
    }
  }

  Future<void> unfriend(String friendshipId) async {
    try {
      await socialRepository.unfriend(friendshipId);
      await refreshFriendships();
      emit(state.copyWith(notice: 'Friend removed.'));
    } catch (error) {
      emit(state.copyWith(notice: error.toString()));
    }
  }

  Future<void> blockFriendship(String friendshipId) async {
    try {
      await socialRepository.blockFriendship(friendshipId);
      await refreshFriendships();
      emit(state.copyWith(notice: 'Friend blocked.'));
    } catch (error) {
      emit(state.copyWith(notice: error.toString()));
    }
  }

  Future<void> createGroupConversation({
    required String title,
    required List<String> memberIds,
  }) async {
    final trimmedTitle = title.trim();
    final uniqueMemberIds = memberIds.toSet().toList();
    if (trimmedTitle.isEmpty || uniqueMemberIds.length < 2) return;

    emit(state.copyWith(sending: true, notice: null));
    try {
      final conversation = await socialRepository.createGroupConversation(
        title: trimmedTitle,
        memberIds: uniqueMemberIds,
      );
      final conversations = [
        conversation,
        ...state.conversations.where((item) => item.id != conversation.id),
      ];
      emit(
        state.copyWith(
          conversations: conversations,
          selectedConversationId: conversation.id,
          messages: const [],
          sending: false,
          notice: 'Group created.',
        ),
      );
      await selectConversation(conversation.id);
    } catch (error) {
      emit(state.copyWith(sending: false, notice: error.toString()));
    }
  }

  Future<void> createGroupInvite({
    required String conversationId,
    required String userId,
  }) async {
    if (conversationId.trim().isEmpty || userId.trim().isEmpty) return;

    emit(state.copyWith(sending: true, notice: null));
    try {
      final conversation = await socialRepository.createGroupInvite(
        conversationId: conversationId,
        userId: userId,
      );
      emit(
        state.copyWith(
          conversations: _upsertConversation(state.conversations, conversation),
          selectedConversationId: conversation.id,
          sending: false,
          notice: 'Invite sent.',
        ),
      );
    } catch (error) {
      emit(state.copyWith(sending: false, notice: error.toString()));
    }
  }

  Future<void> resolveGroupInvite({
    required String conversationId,
    required String userId,
    required String action,
  }) async {
    if (conversationId.trim().isEmpty || userId.trim().isEmpty) return;

    emit(state.copyWith(sending: true, notice: null));
    try {
      final conversation = await socialRepository.resolveGroupInvite(
        conversationId: conversationId,
        userId: userId,
        action: action,
      );
      final accepted = action == 'accept';
      emit(
        state.copyWith(
          conversations: accepted || action == 'cancel'
              ? _upsertConversation(state.conversations, conversation)
              : state.conversations,
          pendingInvites: state.pendingInvites
              .where((item) => item.id != conversation.id)
              .toList(),
          selectedConversationId: accepted
              ? conversation.id
              : state.selectedConversationId,
          sending: false,
          notice: accepted
              ? 'Invite accepted.'
              : action == 'decline'
              ? 'Invite declined.'
              : 'Invite canceled.',
        ),
      );
      if (accepted) await selectConversation(conversation.id);
    } catch (error) {
      emit(state.copyWith(sending: false, notice: error.toString()));
    }
  }

  Future<void> refreshConversations({
    String? selectedConversationId,
    bool reloadSelected = true,
  }) async {
    final results = await Future.wait([
      socialRepository.listConversations(),
      socialRepository.listConversations(membershipStatus: 'PENDING_INVITE'),
    ]);
    final conversations = results[0];
    final pendingInvites = results[1];
    final selectedId =
        selectedConversationId ??
        state.selectedConversationId ??
        conversations.data.firstOrNull?.id;
    emit(
      state.copyWith(
        conversations: conversations.data,
        pendingInvites: pendingInvites.data,
        selectedConversationId: selectedId,
      ),
    );
    if (reloadSelected && selectedId != null) {
      await selectConversation(selectedId);
    }
  }

  Future<void> selectConversation(String conversationId) async {
    emit(state.copyWith(selectedConversationId: conversationId));
    try {
      final response = await socialRepository.listMessages(conversationId);
      final messages = _chronologicalMessages(response.data);
      emit(state.copyWith(messages: messages, error: null));
      final latest = _latestMessage(messages);
      if (latest != null) {
        await _markConversationRead(conversationId, latest.id);
      }
    } catch (error) {
      emit(state.copyWith(notice: error.toString()));
    }
  }

  Future<void> sendMessage(String content) async {
    final conversation = state.selectedConversation;
    final text = content.trim();
    if (conversation == null || text.isEmpty) return;

    stopTyping();
    emit(state.copyWith(sending: true, notice: null));
    try {
      final message = await socialRepository.sendMessage(
        conversationId: conversation.id,
        clientMessageId: _uuidV4(),
        content: text,
      );
      emit(
        state.copyWith(
          messages: _chronologicalMessages([...state.messages, message]),
          sending: false,
          error: null,
        ),
      );
      await refreshConversations(selectedConversationId: conversation.id);
    } catch (error) {
      emit(state.copyWith(sending: false, notice: error.toString()));
    }
  }

  Future<void> sendMangaShare(String mangaId, {String? chapterId}) async {
    final conversation = state.selectedConversation;
    if (conversation == null || mangaId.trim().isEmpty) return;

    stopTyping();
    emit(state.copyWith(sending: true, notice: null));
    try {
      final message = await socialRepository.sendMangaShare(
        conversationId: conversation.id,
        clientMessageId: _uuidV4(),
        mangaId: mangaId,
        chapterId: chapterId,
      );
      emit(
        state.copyWith(
          messages: _chronologicalMessages([...state.messages, message]),
          sending: false,
          error: null,
        ),
      );
      await refreshConversations(selectedConversationId: conversation.id);
    } catch (error) {
      emit(state.copyWith(sending: false, notice: error.toString()));
    }
  }

  void clearNotice() {
    emit(state.copyWith(notice: null));
  }

  void typingChanged(String value) {
    final conversationId = state.selectedConversation?.id;
    if (conversationId == null) return;

    final text = value.trim();
    _typingStopTimer?.cancel();
    if (text.isEmpty) {
      stopTyping();
      return;
    }

    socialSocketService.emitTypingStart(conversationId);
    _typingStopTimer = Timer(const Duration(milliseconds: 1400), stopTyping);
  }

  void stopTyping() {
    _typingStopTimer?.cancel();
    _typingStopTimer = null;
    final conversationId = state.selectedConversation?.id;
    if (conversationId == null) return;
    socialSocketService.emitTypingStop(conversationId);
  }

  List<SocialMessage> _chronologicalMessages(List<SocialMessage> messages) {
    return [...messages]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  SocialMessage? _latestMessage(List<SocialMessage> messages) {
    if (messages.isEmpty) return null;
    return messages.reduce(
      (latest, message) =>
          message.createdAt.isAfter(latest.createdAt) ? message : latest,
    );
  }

  void _bindSocket() {
    _socketSubscriptions.addAll([
      socialSocketService.messageNew.listen(_handleMessageNew),
      socialSocketService.messageDeleted.listen(_handleMessageDeleted),
      socialSocketService.readUpdated.listen(
        (_) => refreshConversations(reloadSelected: false),
      ),
      socialSocketService.typing.listen(_handleTypingIndicator),
      socialSocketService.memberChanged.listen((_) {
        if (!isClosed) refreshConversations(reloadSelected: false);
      }),
      socialSocketService.reactionUpdated.listen(_handleReactionUpdated),
    ]);
  }

  Future<void> _handleMessageNew(SocialMessageNewEvent event) async {
    if (isClosed) return;
    final selectedConversationId = state.selectedConversation?.id;
    final messages = event.conversationId == selectedConversationId
        ? _upsertMessage(state.messages, event.message)
        : state.messages;
    emit(state.copyWith(messages: messages));
    await refreshConversations(
      selectedConversationId: selectedConversationId,
      reloadSelected: false,
    );
    if (event.conversationId == selectedConversationId) {
      await _markConversationRead(event.conversationId, event.message.id);
    }
  }

  void _handleMessageDeleted(SocialMessageDeletedEvent event) {
    if (isClosed || event.conversationId != state.selectedConversation?.id) {
      return;
    }
    emit(
      state.copyWith(
        messages: state.messages
            .where((message) => message.id != event.messageId)
            .toList(),
      ),
    );
  }

  void _handleTypingIndicator(SocialTypingEvent event) {
    if (isClosed || event.user.id == currentUserId) return;

    final typingKey = '${event.conversationId}:${event.user.id}';
    _typingClearTimers[typingKey]?.cancel();
    final next = {...state.typingUsers};
    final users = {...(next[event.conversationId] ?? const <String, String>{})};
    if (event.typing) {
      users[event.user.id] = event.user.displayName;
      next[event.conversationId] = users;
      _typingClearTimers[typingKey] = Timer(
        const Duration(seconds: 4),
        () => _clearTyping(event.conversationId, event.user.id),
      );
    } else {
      users.remove(event.user.id);
      if (users.isEmpty) {
        next.remove(event.conversationId);
      } else {
        next[event.conversationId] = users;
      }
    }
    emit(state.copyWith(typingUsers: next));
  }

  Future<void> toggleReaction(SocialMessage message, String emoji) async {
    if (message.deletedAt != null || emoji.trim().isEmpty) return;

    try {
      final updated = message.currentUserReactions.contains(emoji)
          ? await socialRepository.removeMessageReaction(message.id, emoji)
          : await socialRepository.setMessageReaction(message.id, emoji);
      emit(state.copyWith(messages: _upsertMessage(state.messages, updated)));
    } catch (error) {
      emit(state.copyWith(notice: error.toString()));
    }
  }

  Future<void> toggleMuteSelectedConversation() async {
    final conversation = state.selectedConversation;
    if (conversation == null) return;

    final mutedUntil = conversation.currentMember?.mutedUntil;
    final isMuted =
        mutedUntil != null && mutedUntil.isAfter(DateTime.now().toUtc());
    final nextMutedUntil = isMuted
        ? null
        : DateTime.now().toUtc().add(const Duration(hours: 8));

    try {
      final updated = await socialRepository.muteConversation(
        conversation.id,
        nextMutedUntil,
      );
      emit(
        state.copyWith(
          conversations: _upsertConversation(state.conversations, updated),
          notice: nextMutedUntil == null
              ? 'Conversation unmuted.'
              : 'Conversation muted for 8 hours.',
        ),
      );
    } catch (error) {
      emit(state.copyWith(notice: error.toString()));
    }
  }

  void _handleReactionUpdated(SocialReactionUpdatedEvent event) {
    if (isClosed || event.conversationId != state.selectedConversation?.id) {
      return;
    }
    emit(
      state.copyWith(
        messages: state.messages
            .map(
              (message) => message.id == event.messageId
                  ? message.copyWith(reactionCounts: event.reactionCounts)
                  : message,
            )
            .toList(),
      ),
    );
  }

  void _clearTyping(String conversationId, String userId) {
    if (isClosed) return;
    final typingKey = '$conversationId:$userId';
    final next = {...state.typingUsers};
    final users = {...(next[conversationId] ?? const <String, String>{})}
      ..remove(userId);
    if (users.isEmpty) {
      next.remove(conversationId);
    } else {
      next[conversationId] = users;
    }
    _typingClearTimers.remove(typingKey);
    emit(state.copyWith(typingUsers: next));
  }

  List<SocialMessage> _upsertMessage(
    List<SocialMessage> messages,
    SocialMessage message,
  ) {
    final filtered = messages.where((item) {
      if (item.id == message.id) return false;
      final clientMessageId = message.clientMessageId;
      return clientMessageId == null || item.clientMessageId != clientMessageId;
    });
    return _chronologicalMessages([...filtered, message]);
  }

  List<SocialConversation> _upsertConversation(
    List<SocialConversation> conversations,
    SocialConversation conversation,
  ) {
    return [
      conversation,
      ...conversations.where((item) => item.id != conversation.id),
    ];
  }

  Future<void> _markConversationRead(
    String conversationId,
    String lastMessageId,
  ) async {
    final markedViaSocket = await socialSocketService.markMessageRead(
      conversationId: conversationId,
      lastMessageId: lastMessageId,
    );
    if (!markedViaSocket) {
      await socialRepository.markConversationRead(
        conversationId,
        lastMessageId,
      );
    }
  }

  @override
  Future<void> close() async {
    _typingStopTimer?.cancel();
    for (final timer in _typingClearTimers.values) {
      timer.cancel();
    }
    for (final subscription in _socketSubscriptions) {
      await subscription.cancel();
    }
    return super.close();
  }
}

extension _FirstOrNull<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

String _uuidV4() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  String hexByte(int value) => value.toRadixString(16).padLeft(2, '0');
  final hex = bytes.map(hexByte).join();
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20),
  ].join('-');
}
