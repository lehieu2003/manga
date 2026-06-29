import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../domain/models/models.dart';
import '../cubit/messages_cubit.dart';
import '../cubit/messages_state.dart';
import 'social_avatar.dart';

class CreateGroupSheet extends StatefulWidget {
  const CreateGroupSheet({super.key});

  @override
  State<CreateGroupSheet> createState() => _CreateGroupSheetState();
}

class _CreateGroupSheetState extends State<CreateGroupSheet> {
  final _titleController = TextEditingController();
  final Set<String> _selectedIds = {};

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<MessagesCubit, MessagesState>(
      builder: (context, state) {
        final canCreate =
            _titleController.text.trim().isNotEmpty &&
            _selectedIds.length >= 2 &&
            !state.sending;

        return SafeArea(
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              16,
              10,
              16,
              16 + MediaQuery.viewInsetsOf(context).bottom,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
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
                  'Create group',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _titleController,
                  autofocus: true,
                  maxLength: 80,
                  decoration: const InputDecoration(
                    labelText: 'Group name',
                    prefixIcon: Icon(Icons.groups_outlined),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 8),
                Text(
                  'Select friends',
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 320),
                  child: state.friends.length < 2
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 18),
                          child: Text(
                            'You need at least two friends to create a group.',
                          ),
                        )
                      : ListView.separated(
                          shrinkWrap: true,
                          itemCount: state.friends.length,
                          separatorBuilder: (_, _) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final friendship = state.friends[index];
                            return _FriendCheckboxTile(
                              friendship: friendship,
                              selected: _selectedIds.contains(
                                friendship.friend.id,
                              ),
                              onChanged: () {
                                setState(() {
                                  if (!_selectedIds.add(
                                    friendship.friend.id,
                                  )) {
                                    _selectedIds.remove(friendship.friend.id);
                                  }
                                });
                              },
                            );
                          },
                        ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: canCreate
                        ? () async {
                            await context
                                .read<MessagesCubit>()
                                .createGroupConversation(
                                  title: _titleController.text,
                                  memberIds: _selectedIds.toList(),
                                );
                            if (context.mounted) Navigator.pop(context);
                          }
                        : null,
                    icon: state.sending
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.groups_outlined),
                    label: const Text('Create group'),
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

class _FriendCheckboxTile extends StatelessWidget {
  const _FriendCheckboxTile({
    required this.friendship,
    required this.selected,
    required this.onChanged,
  });

  final Friendship friendship;
  final bool selected;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return CheckboxListTile(
      value: selected,
      onChanged: (_) => onChanged(),
      secondary: SocialAvatar(
        label: friendship.friend.displayName,
        avatarUrl: friendship.friend.avatarUrl,
      ),
      title: Text(
        friendship.friend.displayName,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}
