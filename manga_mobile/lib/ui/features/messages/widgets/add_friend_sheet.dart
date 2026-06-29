import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../cubit/messages_cubit.dart';
import '../cubit/messages_state.dart';
import 'social_avatar.dart';

class AddFriendSheet extends StatefulWidget {
  const AddFriendSheet({super.key});

  @override
  State<AddFriendSheet> createState() => _AddFriendSheetState();
}

class _AddFriendSheetState extends State<AddFriendSheet> {
  final _searchController = TextEditingController();
  String? _selectedUserId;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<MessagesCubit, MessagesState>(
      builder: (context, state) {
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
                  'Add friend',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _searchController,
                  autofocus: true,
                  decoration: const InputDecoration(
                    labelText: 'Search readers',
                    prefixIcon: Icon(Icons.person_search_outlined),
                  ),
                  onChanged: (value) {
                    setState(() => _selectedUserId = null);
                    context.read<MessagesCubit>().searchUsers(value);
                  },
                ),
                const SizedBox(height: 12),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 280),
                  child: state.userResults.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 18),
                          child: Text('No readers found'),
                        )
                      : ListView.separated(
                          shrinkWrap: true,
                          itemCount: state.userResults.length,
                          separatorBuilder: (_, _) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final user = state.userResults[index];
                            return RadioListTile<String>(
                              value: user.id,
                              groupValue: _selectedUserId,
                              onChanged: (value) {
                                setState(() => _selectedUserId = value);
                              },
                              secondary: SocialAvatar(
                                label: user.displayName,
                                avatarUrl: user.avatarUrl,
                              ),
                              title: Text(
                                user.displayName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          },
                        ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _selectedUserId == null
                        ? null
                        : () async {
                            await context
                                .read<MessagesCubit>()
                                .sendFriendRequest(_selectedUserId!);
                            if (context.mounted) Navigator.pop(context);
                          },
                    icon: const Icon(Icons.person_add_alt),
                    label: const Text('Send friend request'),
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
