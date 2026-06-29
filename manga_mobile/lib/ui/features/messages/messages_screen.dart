import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app_state.dart';
import '../../core/widgets.dart';
import 'cubit/messages_cubit.dart';
import 'cubit/messages_state.dart';
import 'widgets/add_friend_sheet.dart';
import 'widgets/create_group_sheet.dart';
import 'widgets/friend_requests_sheet.dart';
import 'widgets/manga_share_sheet.dart';
import 'widgets/message_thread.dart';
import 'widgets/messages_inbox.dart';

class MessagesScreen extends StatelessWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.read(context);
    final user = app.user;

    if (user == null) {
      return const AsyncPane(message: 'Login to use messages.');
    }

    return BlocProvider(
      create: (_) => MessagesCubit(
        socialRepository: app.socialRepository,
        socialSocketService: app.socialSocketService,
        currentUserId: user.id,
      )..load(),
      child: _MessagesView(currentUserId: user.id),
    );
  }
}

class _MessagesView extends StatefulWidget {
  const _MessagesView({required this.currentUserId});

  final String currentUserId;

  @override
  State<_MessagesView> createState() => _MessagesViewState();
}

class _MessagesViewState extends State<_MessagesView> {
  final _messageController = TextEditingController();
  late AppState _appState;
  bool _showCompactThread = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _appState = AppScope.read(context);
  }

  @override
  void dispose() {
    _appState.setShellChromeHidden(false);
    _messageController.dispose();
    super.dispose();
  }

  void _setCompactThreadVisible(bool visible) {
    if (_showCompactThread == visible) return;
    setState(() => _showCompactThread = visible);
    _appState.setShellChromeHidden(visible);
  }

  void _showShellChromeAfterBuild() {
    if (!_appState.hideShellChrome) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _appState.setShellChromeHidden(false);
    });
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _openAddFriendSheet(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => BlocProvider.value(
        value: context.read<MessagesCubit>(),
        child: const AddFriendSheet(),
      ),
    );
  }

  Future<void> _openFriendRequestsSheet(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => BlocProvider.value(
        value: context.read<MessagesCubit>(),
        child: const FriendRequestsSheet(),
      ),
    );
  }

  Future<void> _openCreateGroupSheet(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => BlocProvider.value(
        value: context.read<MessagesCubit>(),
        child: const CreateGroupSheet(),
      ),
    );
  }

  Future<void> _openMangaShareSheet(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => BlocProvider.value(
        value: context.read<MessagesCubit>(),
        child: const MangaShareSheet(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<MessagesCubit, MessagesState>(
      listenWhen: (previous, current) => previous.notice != current.notice,
      listener: (context, state) {
        if (state.notice != null) {
          _showSnack(state.notice!);
          context.read<MessagesCubit>().clearNotice();
        }
      },
      builder: (context, state) {
        final messagesCubit = context.read<MessagesCubit>();
        if (state.loading) {
          return const AsyncPane(message: 'Loading messages...');
        }

        if (state.error != null) {
          return AsyncPane(
            message: state.error!,
            onRetry: () => context.read<MessagesCubit>().load(),
          );
        }

        return LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 760;
            if (wide) {
              _showShellChromeAfterBuild();
              return Row(
                children: [
                  SizedBox(
                    width: 330,
                    child: MessagesInbox(
                      state: state,
                      currentUserId: widget.currentUserId,
                      onAddFriend: () => _openAddFriendSheet(context),
                      onCreateGroup: () => _openCreateGroupSheet(context),
                      onOpenRequests: () => _openFriendRequestsSheet(context),
                      onSelectConversation: (conversation) {
                        messagesCubit.selectConversation(conversation.id);
                      },
                    ),
                  ),
                  const VerticalDivider(width: 1),
                  Expanded(
                    child: MessageThread(
                      state: state,
                      currentUserId: widget.currentUserId,
                      messageController: _messageController,
                      showBackButton: false,
                      onBack: () {},
                      onSend: messagesCubit.sendMessage,
                      onShareManga: () => _openMangaShareSheet(context),
                      onTypingChanged: messagesCubit.typingChanged,
                      onTypingStopped: messagesCubit.stopTyping,
                    ),
                  ),
                ],
              );
            }

            if (_showCompactThread && state.selectedConversation != null) {
              return MessageThread(
                state: state,
                currentUserId: widget.currentUserId,
                messageController: _messageController,
                showBackButton: true,
                onBack: () => _setCompactThreadVisible(false),
                onSend: messagesCubit.sendMessage,
                onShareManga: () => _openMangaShareSheet(context),
                onTypingChanged: messagesCubit.typingChanged,
                onTypingStopped: messagesCubit.stopTyping,
              );
            }

            return MessagesInbox(
              state: state,
              currentUserId: widget.currentUserId,
              onAddFriend: () => _openAddFriendSheet(context),
              onCreateGroup: () => _openCreateGroupSheet(context),
              onOpenRequests: () => _openFriendRequestsSheet(context),
              onSelectConversation: (conversation) {
                messagesCubit.selectConversation(conversation.id);
                _setCompactThreadVisible(true);
              },
            );
          },
        );
      },
    );
  }
}
