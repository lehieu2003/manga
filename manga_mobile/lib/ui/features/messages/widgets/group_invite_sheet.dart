import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../cubit/messages_cubit.dart';
import '../cubit/messages_state.dart';
import 'social_avatar.dart';

class GroupInviteSheet extends StatelessWidget {
  const GroupInviteSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<MessagesCubit, MessagesState>(
      builder: (context, state) {
        final conversation = state.selectedConversation;
        final unavailableIds =
            conversation?.members
                .where((member) => member.status != 'LEFT')
                .map((member) => member.userId)
                .toSet() ??
            const <String>{};
        final friends = state.friends
            .where(
              (friendship) => !unavailableIds.contains(friendship.friend.id),
            )
            .toList();

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Invite member',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Close invite sheet',
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Choose a friend who is not already in this group.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                if (friends.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text('No eligible friends to invite.'),
                    ),
                  )
                else
                  Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: friends.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final friendship = friends[index];
                        return Card(
                          child: ListTile(
                            leading: SocialAvatar(
                              label: friendship.friend.displayName,
                              avatarUrl: friendship.friend.avatarUrl,
                            ),
                            title: Text(
                              friendship.friend.displayName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            trailing: FilledButton.icon(
                              onPressed: state.sending || conversation == null
                                  ? null
                                  : () {
                                      context
                                          .read<MessagesCubit>()
                                          .createGroupInvite(
                                            conversationId: conversation.id,
                                            userId: friendship.friend.id,
                                          );
                                      Navigator.of(context).pop();
                                    },
                              icon: const Icon(Icons.person_add_alt),
                              label: const Text('Invite'),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
