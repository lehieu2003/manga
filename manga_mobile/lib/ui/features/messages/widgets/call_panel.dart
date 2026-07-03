import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../cubit/call_state.dart';

class CallPanel extends StatelessWidget {
  const CallPanel({
    super.key,
    required this.state,
    required this.onAccept,
    required this.onDecline,
    required this.onHangUp,
    required this.onToggleAudio,
    required this.onToggleVideo,
  });

  final CallState state;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final VoidCallback onHangUp;
  final VoidCallback onToggleAudio;
  final VoidCallback onToggleVideo;

  @override
  Widget build(BuildContext context) {
    if (!state.hasActiveCall && state.status != CallUiStatus.ended) {
      return const SizedBox.shrink();
    }

    final call = state.call ?? state.incomingCall;
    final scheme = Theme.of(context).colorScheme;
    final isVideo = call?.isVideo == true;
    final label = switch (state.status) {
      CallUiStatus.ringingIncoming =>
        isVideo ? 'Incoming video call' : 'Incoming voice call',
      CallUiStatus.ringingOutgoing =>
        isVideo ? 'Calling video...' : 'Calling...',
      CallUiStatus.connecting => 'Connecting...',
      CallUiStatus.active => isVideo ? 'Video call' : 'Voice call',
      CallUiStatus.ended => 'Call ended',
      CallUiStatus.idle => '',
    };

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: scheme.primaryContainer,
                    child: Icon(
                      isVideo ? Icons.videocam : Icons.call,
                      color: scheme.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      label,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                  ),
                  if (state.status == CallUiStatus.connecting ||
                      state.status == CallUiStatus.ringingOutgoing)
                    const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                ],
              ),
              if (state.error != null) ...[
                const SizedBox(height: 8),
                Text(
                  state.error!,
                  style: TextStyle(
                    color: scheme.error,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
              if (isVideo && state.status != CallUiStatus.ringingIncoming) ...[
                const SizedBox(height: 12),
                _VideoStage(state: state),
              ],
              const SizedBox(height: 12),
              if (state.status == CallUiStatus.ringingIncoming)
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: onAccept,
                        icon: const Icon(Icons.call),
                        label: const Text('Accept'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: FilledButton.tonalIcon(
                        onPressed: onDecline,
                        icon: const Icon(Icons.call_end),
                        label: const Text('Decline'),
                      ),
                    ),
                  ],
                )
              else
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    IconButton.filledTonal(
                      tooltip: state.audioEnabled ? 'Mute mic' : 'Unmute mic',
                      onPressed: onToggleAudio,
                      icon: Icon(
                        state.audioEnabled ? Icons.mic : Icons.mic_off,
                      ),
                    ),
                    if (isVideo)
                      IconButton.filledTonal(
                        tooltip: state.videoEnabled
                            ? 'Turn camera off'
                            : 'Turn camera on',
                        onPressed: onToggleVideo,
                        icon: Icon(
                          state.videoEnabled
                              ? Icons.videocam
                              : Icons.videocam_off,
                        ),
                      ),
                    IconButton.filled(
                      tooltip: 'End call',
                      onPressed: onHangUp,
                      style: IconButton.styleFrom(
                        backgroundColor: scheme.error,
                        foregroundColor: scheme.onError,
                      ),
                      icon: const Icon(Icons.call_end),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VideoStage extends StatelessWidget {
  const _VideoStage({required this.state});

  final CallState state;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: ColoredBox(
          color: Colors.black,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (state.remoteRenderer != null)
                RTCVideoView(
                  state.remoteRenderer!,
                  objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                )
              else
                Center(
                  child: Text(
                    state.remoteVideoEnabled
                        ? 'Waiting for video'
                        : 'Camera is off',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              Positioned(
                right: 10,
                bottom: 10,
                width: 112,
                height: 84,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: scheme.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: scheme.outlineVariant),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(13),
                    child: state.localRenderer == null || !state.videoEnabled
                        ? Icon(
                            Icons.videocam_off,
                            color: scheme.onSurfaceVariant,
                          )
                        : RTCVideoView(
                            state.localRenderer!,
                            mirror: true,
                            objectFit: RTCVideoViewObjectFit
                                .RTCVideoViewObjectFitCover,
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
