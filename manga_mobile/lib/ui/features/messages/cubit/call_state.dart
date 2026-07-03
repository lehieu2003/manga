import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../../../../domain/models/models.dart';

enum CallUiStatus {
  idle,
  ringingOutgoing,
  ringingIncoming,
  connecting,
  active,
  ended,
}

class CallState {
  const CallState({
    required this.status,
    required this.audioEnabled,
    required this.videoEnabled,
    required this.remoteAudioEnabled,
    required this.remoteVideoEnabled,
    this.call,
    this.incomingCall,
    this.localRenderer,
    this.remoteRenderer,
    this.error,
  });

  factory CallState.initial() => const CallState(
    status: CallUiStatus.idle,
    audioEnabled: true,
    videoEnabled: true,
    remoteAudioEnabled: true,
    remoteVideoEnabled: true,
  );

  final CallUiStatus status;
  final SocialCall? call;
  final SocialCall? incomingCall;
  final RTCVideoRenderer? localRenderer;
  final RTCVideoRenderer? remoteRenderer;
  final bool audioEnabled;
  final bool videoEnabled;
  final bool remoteAudioEnabled;
  final bool remoteVideoEnabled;
  final String? error;

  bool get hasActiveCall =>
      status == CallUiStatus.ringingOutgoing ||
      status == CallUiStatus.ringingIncoming ||
      status == CallUiStatus.connecting ||
      status == CallUiStatus.active;

  static const _unset = Object();

  CallState copyWith({
    CallUiStatus? status,
    Object? call = _unset,
    Object? incomingCall = _unset,
    Object? localRenderer = _unset,
    Object? remoteRenderer = _unset,
    bool? audioEnabled,
    bool? videoEnabled,
    bool? remoteAudioEnabled,
    bool? remoteVideoEnabled,
    Object? error = _unset,
  }) {
    return CallState(
      status: status ?? this.status,
      call: call == _unset ? this.call : call as SocialCall?,
      incomingCall: incomingCall == _unset
          ? this.incomingCall
          : incomingCall as SocialCall?,
      localRenderer: localRenderer == _unset
          ? this.localRenderer
          : localRenderer as RTCVideoRenderer?,
      remoteRenderer: remoteRenderer == _unset
          ? this.remoteRenderer
          : remoteRenderer as RTCVideoRenderer?,
      audioEnabled: audioEnabled ?? this.audioEnabled,
      videoEnabled: videoEnabled ?? this.videoEnabled,
      remoteAudioEnabled: remoteAudioEnabled ?? this.remoteAudioEnabled,
      remoteVideoEnabled: remoteVideoEnabled ?? this.remoteVideoEnabled,
      error: error == _unset ? this.error : error as String?,
    );
  }
}
