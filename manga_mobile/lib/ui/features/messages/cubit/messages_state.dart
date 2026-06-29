import '../../../../domain/models/models.dart';

class MessagesState {
  const MessagesState({
    required this.loading,
    required this.friendshipLoading,
    required this.sending,
    required this.searchQuery,
    required this.userResults,
    required this.friends,
    required this.incomingRequests,
    required this.sentRequests,
    required this.conversations,
    required this.typingUsers,
    required this.messages,
    this.selectedConversationId,
    this.error,
    this.notice,
  });

  factory MessagesState.initial() {
    return const MessagesState(
      loading: true,
      friendshipLoading: true,
      sending: false,
      searchQuery: '',
      userResults: [],
      friends: [],
      incomingRequests: [],
      sentRequests: [],
      conversations: [],
      typingUsers: {},
      messages: [],
    );
  }

  final bool loading;
  final bool friendshipLoading;
  final bool sending;
  final String searchQuery;
  final List<SocialUser> userResults;
  final List<Friendship> friends;
  final List<Friendship> incomingRequests;
  final List<Friendship> sentRequests;
  final List<SocialConversation> conversations;
  final Map<String, Map<String, String>> typingUsers;
  final String? selectedConversationId;
  final List<SocialMessage> messages;
  final String? error;
  final String? notice;

  SocialConversation? get selectedConversation {
    for (final conversation in conversations) {
      if (conversation.id == selectedConversationId) return conversation;
    }
    return conversations.isEmpty ? null : conversations.first;
  }

  static const _unset = Object();

  MessagesState copyWith({
    bool? loading,
    bool? friendshipLoading,
    bool? sending,
    String? searchQuery,
    List<SocialUser>? userResults,
    List<Friendship>? friends,
    List<Friendship>? incomingRequests,
    List<Friendship>? sentRequests,
    List<SocialConversation>? conversations,
    Map<String, Map<String, String>>? typingUsers,
    Object? selectedConversationId = _unset,
    List<SocialMessage>? messages,
    Object? error = _unset,
    Object? notice = _unset,
  }) {
    return MessagesState(
      loading: loading ?? this.loading,
      friendshipLoading: friendshipLoading ?? this.friendshipLoading,
      sending: sending ?? this.sending,
      searchQuery: searchQuery ?? this.searchQuery,
      userResults: userResults ?? this.userResults,
      friends: friends ?? this.friends,
      incomingRequests: incomingRequests ?? this.incomingRequests,
      sentRequests: sentRequests ?? this.sentRequests,
      conversations: conversations ?? this.conversations,
      typingUsers: typingUsers ?? this.typingUsers,
      selectedConversationId: selectedConversationId == _unset
          ? this.selectedConversationId
          : selectedConversationId as String?,
      messages: messages ?? this.messages,
      error: error == _unset ? this.error : error as String?,
      notice: notice == _unset ? this.notice : notice as String?,
    );
  }
}

String typingLabelFor(Map<String, Map<String, String>> typingUsers, String conversationId) {
  final names = typingUsers[conversationId]?.values.where((name) => name.isNotEmpty).toList() ?? const <String>[];
  if (names.isEmpty) return '';
  if (names.length == 1) return names.first;
  if (names.length == 2) return '${names[0]} and ${names[1]}';
  return '${names.first} and ${names.length - 1} others';
}

String typingSentenceFor(String typingLabel) {
  if (typingLabel.isEmpty) return '';
  final verb = typingLabel.contains(' and ') || typingLabel.contains(' others') ? 'are' : 'is';
  return '$typingLabel $verb typing...';
}
