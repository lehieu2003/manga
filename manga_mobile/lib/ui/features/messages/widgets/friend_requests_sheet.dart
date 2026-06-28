import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../domain/models/models.dart';
import '../cubit/messages_cubit.dart';
import '../cubit/messages_state.dart';

class FriendRequestsSheet extends StatelessWidget {
  const FriendRequestsSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<MessagesCubit, MessagesState>(
      builder: (context, state) {
        return SafeArea(
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.72,
            minChildSize: 0.42,
            maxChildSize: 0.92,
            builder: (context, controller) {
              return ListView(
                controller: controller,
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
                children: [
                  Center(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.outlineVariant,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const SizedBox(width: 44, height: 4),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Friend requests',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  _Section(
                    title: 'Incoming',
                    empty: 'No incoming requests',
                    children: state.incomingRequests
                        .map(
                          (friendship) => _FriendshipActionTile(
                            friendship: friendship,
                            subtitle: 'Wants to connect',
                            actions: [
                              IconButton.filledTonal(
                                tooltip: 'Accept request',
                                onPressed: () => context
                                    .read<MessagesCubit>()
                                    .acceptFriendRequest(friendship.id),
                                icon: const Icon(Icons.check),
                              ),
                              IconButton(
                                tooltip: 'Reject request',
                                onPressed: () => context
                                    .read<MessagesCubit>()
                                    .rejectFriendRequest(friendship.id),
                                icon: const Icon(Icons.close),
                              ),
                            ],
                          ),
                        )
                        .toList(),
                  ),
                  _Section(
                    title: 'Friends',
                    empty: 'No friends yet',
                    children: state.friends
                        .map(
                          (friendship) => _FriendshipActionTile(
                            friendship: friendship,
                            subtitle: 'Direct message ready',
                            actions: [
                              IconButton(
                                tooltip: 'Block friend',
                                onPressed: () => context
                                    .read<MessagesCubit>()
                                    .blockFriendship(friendship.id),
                                icon: const Icon(Icons.block),
                              ),
                              IconButton(
                                tooltip: 'Remove friend',
                                onPressed: () => context
                                    .read<MessagesCubit>()
                                    .unfriend(friendship.id),
                                icon: const Icon(Icons.person_remove_outlined),
                              ),
                            ],
                          ),
                        )
                        .toList(),
                  ),
                  _Section(
                    title: 'Sent',
                    empty: 'No sent requests',
                    children: state.sentRequests
                        .map(
                          (friendship) => _FriendshipActionTile(
                            friendship: friendship,
                            subtitle: 'Pending',
                            actions: const [],
                          ),
                        )
                        .toList(),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.empty,
    required this.children,
  });

  final String title;
  final String empty;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          if (children.isEmpty)
            Text(empty, style: Theme.of(context).textTheme.bodyMedium)
          else
            ...children,
        ],
      ),
    );
  }
}

class _FriendshipActionTile extends StatelessWidget {
  const _FriendshipActionTile({
    required this.friendship,
    required this.subtitle,
    required this.actions,
  });

  final Friendship friendship;
  final String subtitle;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        child: Text(friendship.friend.displayName.characters.first),
      ),
      title: Text(
        friendship.friend.displayName,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontWeight: FontWeight.w800),
      ),
      subtitle: Text(subtitle),
      trailing: actions.isEmpty ? null : Wrap(spacing: 4, children: actions),
    );
  }
}
