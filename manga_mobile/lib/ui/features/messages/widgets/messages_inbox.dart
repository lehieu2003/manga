import 'package:flutter/material.dart';

import '../../../../domain/models/models.dart';
import '../cubit/messages_state.dart';
import 'conversation_tile.dart';

class MessagesInbox extends StatefulWidget {
  const MessagesInbox({
    super.key,
    required this.state,
    required this.currentUserId,
    required this.onAddFriend,
    required this.onOpenRequests,
    required this.onSelectConversation,
  });

  final MessagesState state;
  final String currentUserId;
  final VoidCallback onAddFriend;
  final VoidCallback onOpenRequests;
  final ValueChanged<SocialConversation> onSelectConversation;

  @override
  State<MessagesInbox> createState() => _MessagesInboxState();
}

class _MessagesInboxState extends State<MessagesInbox> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _searchController.text.trim().toLowerCase();
    final conversations = widget.state.conversations.where((conversation) {
      if (query.isEmpty) return true;
      return conversation
          .titleFor(widget.currentUserId)
          .toLowerCase()
          .contains(query);
    }).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Chats',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            IconButton.filledTonal(
              tooltip: 'Add friend',
              onPressed: widget.onAddFriend,
              icon: const Icon(Icons.person_add_alt),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SearchBar(
          controller: _searchController,
          hintText: 'Search chats',
          leading: const Icon(Icons.search),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 14),
        _FriendStoryRow(
          friends: widget.state.friends,
          onOpenRequests: widget.onOpenRequests,
          requestCount: widget.state.incomingRequests.length,
        ),
        const SizedBox(height: 10),
        if (widget.state.incomingRequests.isNotEmpty)
          Card(
            child: ListTile(
              leading: Badge.count(
                count: widget.state.incomingRequests.length,
                child: const CircleAvatar(child: Icon(Icons.person_add_alt)),
              ),
              title: const Text(
                'Friend requests',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
              subtitle: Text('${widget.state.incomingRequests.length} pending'),
              trailing: const Icon(Icons.chevron_right),
              onTap: widget.onOpenRequests,
            ),
          ),
        if (conversations.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 40),
            child: Center(child: Text('No chats yet')),
          )
        else
          ...conversations.map(
            (conversation) => ConversationTile(
              conversation: conversation,
              currentUserId: widget.currentUserId,
              selected:
                  conversation.id == widget.state.selectedConversation?.id,
              typingLabel: widget.state.typingUsers[conversation.id],
              onTap: () => widget.onSelectConversation(conversation),
            ),
          ),
      ],
    );
  }
}

class _FriendStoryRow extends StatelessWidget {
  const _FriendStoryRow({
    required this.friends,
    required this.requestCount,
    required this.onOpenRequests,
  });

  final List<Friendship> friends;
  final int requestCount;
  final VoidCallback onOpenRequests;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 86,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: friends.length + 1,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          if (index == 0) {
            return _StoryAvatar(
              label: 'Requests',
              icon: Icons.group_add_outlined,
              badgeCount: requestCount,
              onTap: onOpenRequests,
            );
          }
          final friend = friends[index - 1].friend;
          return _StoryAvatar(
            label: friend.displayName,
            initial: friend.displayName.characters.first,
            onTap: onOpenRequests,
          );
        },
      ),
    );
  }
}

class _StoryAvatar extends StatelessWidget {
  const _StoryAvatar({
    required this.label,
    required this.onTap,
    this.icon,
    this.initial,
    this.badgeCount = 0,
  });

  final String label;
  final VoidCallback onTap;
  final IconData? icon;
  final String? initial;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    final avatar = CircleAvatar(
      radius: 24,
      child: icon == null ? Text(initial ?? '?') : Icon(icon),
    );
    return SizedBox(
      width: 70,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Column(
          children: [
            badgeCount > 0
                ? Badge.count(count: badgeCount, child: avatar)
                : avatar,
            const SizedBox(height: 6),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ],
        ),
      ),
    );
  }
}
