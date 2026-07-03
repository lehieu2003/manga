import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app_state.dart';
import '../../core/widgets.dart';
import 'cubit/call_cubit.dart';
import 'cubit/call_state.dart';
import 'cubit/messages_cubit.dart';
import 'cubit/messages_state.dart';
import 'widgets/add_friend_sheet.dart';
import 'widgets/create_group_sheet.dart';
import 'widgets/friend_requests_sheet.dart';
import 'widgets/group_invite_sheet.dart';
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

    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) => MessagesCubit(
            socialRepository: app.socialRepository,
            socialSocketService: app.socialSocketService,
            currentUserId: user.id,
          )..load(),
        ),
        BlocProvider(
          create: (_) => CallCubit(
            socialRepository: app.socialRepository,
            socialSocketService: app.socialSocketService,
            currentUserId: user.id,
          ),
        ),
      ],
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

  Future<void> _openGroupInviteSheet(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => BlocProvider.value(
        value: context.read<MessagesCubit>(),
        child: const GroupInviteSheet(),
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

        return BlocBuilder<CallCubit, CallState>(
          builder: (context, callState) {
            final callCubit = context.read<CallCubit>();
            MessageThread buildThread({required bool showBackButton}) {
              return MessageThread(
                state: state,
                callState: callState,
                currentUserId: widget.currentUserId,
                messageController: _messageController,
                showBackButton: showBackButton,
                onBack: () => _setCompactThreadVisible(false),
                onStartAudioCall: () {
                  final conversation = state.selectedConversation;
                  if (conversation != null) {
                    callCubit.startCall(conversation, 'AUDIO');
                  }
                },
                onStartVideoCall: () {
                  final conversation = state.selectedConversation;
                  if (conversation != null) {
                    callCubit.startCall(conversation, 'VIDEO');
                  }
                },
                onAcceptCall: callCubit.acceptIncomingCall,
                onDeclineCall: callCubit.declineIncomingCall,
                onHangUpCall: callCubit.hangUp,
                onToggleCallAudio: callCubit.toggleAudio,
                onToggleCallVideo: callCubit.toggleVideo,
                onSend: messagesCubit.sendMessage,
                onShareManga: () => _openMangaShareSheet(context),
                onInviteMember: () => _openGroupInviteSheet(context),
                onCancelInvite: (userId) {
                  final conversation = state.selectedConversation;
                  if (conversation == null) return;
                  messagesCubit.resolveGroupInvite(
                    conversationId: conversation.id,
                    userId: userId,
                    action: 'cancel',
                  );
                },
                onToggleMute: messagesCubit.toggleMuteSelectedConversation,
                onToggleReaction: messagesCubit.toggleReaction,
                onTypingChanged: messagesCubit.typingChanged,
                onTypingStopped: messagesCubit.stopTyping,
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
                          onOpenRequests: () =>
                              _openFriendRequestsSheet(context),
                          onResolveInvite: (conversation, action) {
                            messagesCubit.resolveGroupInvite(
                              conversationId: conversation.id,
                              userId: widget.currentUserId,
                              action: action,
                            );
                          },
                          onSelectConversation: (conversation) {
                            messagesCubit.selectConversation(conversation.id);
                          },
                        ),
                      ),
                      const VerticalDivider(width: 1),
                      Expanded(child: buildThread(showBackButton: false)),
                    ],
                  );
                }

                if (_showCompactThread && state.selectedConversation != null) {
                  return buildThread(showBackButton: true);
                }

                return MessagesInbox(
                  state: state,
                  currentUserId: widget.currentUserId,
                  onAddFriend: () => _openAddFriendSheet(context),
                  onCreateGroup: () => _openCreateGroupSheet(context),
                  onOpenRequests: () => _openFriendRequestsSheet(context),
                  onResolveInvite: (conversation, action) {
                    messagesCubit.resolveGroupInvite(
                      conversationId: conversation.id,
                      userId: widget.currentUserId,
                      action: action,
                    );
                  },
                  onSelectConversation: (conversation) {
                    messagesCubit.selectConversation(conversation.id);
                    _setCompactThreadVisible(true);
                  },
                );
              },
            );
          },
        );
      },
    );
  }
}
