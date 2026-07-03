import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../../../../data/repositories/repositories.dart';
import '../../../../data/services/social_socket_service.dart';
import '../../../../domain/models/models.dart';
import 'call_state.dart';

class CallCubit extends Cubit<CallState> {
  CallCubit({
    required this.socialRepository,
    required this.socialSocketService,
    required this.currentUserId,
  }) : super(CallState.initial()) {
    _bindSocket();
  }

  final SocialRepository socialRepository;
  final SocialSocketService socialSocketService;
  final String currentUserId;
  final List<StreamSubscription<dynamic>> _subscriptions = [];
  final List<SocialCallSignalEvent> _pendingIceCandidates = [];

  RTCPeerConnection? _peer;
  MediaStream? _localStream;
  List<IceServer> _iceServers = const [];
  SocialCallSignalEvent? _pendingOffer;

  Future<void> startCall(
    SocialConversation conversation,
    String mediaType,
  ) async {
    if (state.hasActiveCall) return;
    try {
      emit(
        state.copyWith(
          status: CallUiStatus.ringingOutgoing,
          error: null,
          incomingCall: null,
        ),
      );
      final response = await socialRepository.startCall(
        conversationId: conversation.id,
        mediaType: mediaType,
      );
      _iceServers = response.iceServers;
      _log('call-started', {
        'callId': response.call.id,
        'conversationId': conversation.id,
        'mediaType': mediaType,
        'participantStatuses': response.call.participants
            .map((participant) => '${participant.userId}:${participant.status}')
            .join(','),
      });
      emit(
        state.copyWith(
          call: response.call,
          videoEnabled: response.call.isVideo,
        ),
      );
      await _createPeer(response.call);
    } catch (error) {
      await _cleanupMedia();
      emit(
        state.copyWith(
          status: CallUiStatus.ended,
          error: _friendlyError(error, 'Could not start call.'),
        ),
      );
    }
  }

  Future<void> acceptIncomingCall() async {
    final incomingCall = state.incomingCall;
    if (incomingCall == null) return;
    try {
      emit(state.copyWith(status: CallUiStatus.connecting, error: null));
      final response = await socialRepository.joinCall(incomingCall.id);
      _iceServers = response.iceServers;
      _log('call-joined', {
        'callId': response.call.id,
        'mediaType': response.call.mediaType,
        'pendingOffer': _pendingOffer != null,
      });
      emit(
        state.copyWith(
          call: response.call,
          incomingCall: null,
          videoEnabled: response.call.isVideo,
        ),
      );
      await _createPeer(response.call);
      final offer = _pendingOffer;
      if (offer != null) {
        _pendingOffer = null;
        await _handleOffer(offer);
      }
    } catch (error) {
      await _cleanupMedia();
      emit(
        state.copyWith(
          status: CallUiStatus.ended,
          error: _friendlyError(error, 'Could not join call.'),
        ),
      );
    }
  }

  Future<void> declineIncomingCall() async {
    final incomingCall = state.incomingCall;
    if (incomingCall == null) return;
    try {
      await socialRepository.declineCall(incomingCall.id);
    } catch (_) {
      // The call may already be gone. Local UI should still clear.
    }
    _pendingOffer = null;
    emit(
      state.copyWith(
        status: CallUiStatus.idle,
        call: null,
        incomingCall: null,
        error: null,
      ),
    );
  }

  Future<void> hangUp() async {
    final call = state.call;
    await _cleanupMedia();
    emit(
      state.copyWith(
        status: CallUiStatus.ended,
        call: null,
        incomingCall: null,
      ),
    );
    if (call == null) return;
    try {
      await socialRepository.leaveCall(call.id);
    } catch (_) {
      // Backend may already have ended the call.
    }
  }

  Future<void> toggleAudio() async {
    final next = !state.audioEnabled;
    for (final track
        in _localStream?.getAudioTracks() ?? <MediaStreamTrack>[]) {
      track.enabled = next;
    }
    emit(state.copyWith(audioEnabled: next));
    await _sendMediaState(audioEnabled: next, videoEnabled: state.videoEnabled);
  }

  Future<void> toggleVideo() async {
    final next = !state.videoEnabled;
    for (final track
        in _localStream?.getVideoTracks() ?? <MediaStreamTrack>[]) {
      track.enabled = next;
    }
    emit(state.copyWith(videoEnabled: next));
    await _sendMediaState(audioEnabled: state.audioEnabled, videoEnabled: next);
  }

  void _bindSocket() {
    _subscriptions.addAll([
      socialSocketService.callIncoming.listen(_handleIncomingCall),
      socialSocketService.callParticipantJoined.listen((event) async {
        if (event.callId != state.call?.id) return;
        _log('participant-joined', {
          'callId': event.callId,
          'userId': event.userId,
          'initiatorId': event.call.initiatorId,
          'currentUserId': currentUserId,
        });
        emit(state.copyWith(call: event.call));
        if (state.status == CallUiStatus.ringingOutgoing) {
          emit(state.copyWith(status: CallUiStatus.connecting));
        }
        if (event.call.initiatorId == currentUserId &&
            event.userId != currentUserId) {
          await _sendOfferToPeer(event.call, event.userId);
        }
      }),
      socialSocketService.callParticipantLeft.listen((event) {
        if (event.callId != state.call?.id) return;
        emit(state.copyWith(call: event.call));
      }),
      socialSocketService.callEnded.listen((event) async {
        if (event.callId != state.call?.id &&
            event.callId != state.incomingCall?.id) {
          return;
        }
        await _cleanupMedia();
        _pendingOffer = null;
        emit(
          state.copyWith(
            status: CallUiStatus.ended,
            call: event.call,
            incomingCall: null,
          ),
        );
      }),
      socialSocketService.callOffer.listen(_handleOffer),
      socialSocketService.callAnswer.listen(_handleAnswer),
      socialSocketService.callIceCandidate.listen(_handleIceCandidate),
      socialSocketService.callMediaState.listen(_handleRemoteMediaState),
    ]);
  }

  void _handleIncomingCall(SocialCall call) {
    if (call.initiatorId == currentUserId || state.hasActiveCall) return;
    _log('incoming-call', {
      'callId': call.id,
      'initiatorId': call.initiatorId,
      'mediaType': call.mediaType,
    });
    emit(
      state.copyWith(
        status: CallUiStatus.ringingIncoming,
        call: call,
        incomingCall: call,
        videoEnabled: call.isVideo,
        error: null,
      ),
    );
  }

  Future<void> _handleOffer(SocialCallSignalEvent event) async {
    final call = state.call;
    if (call == null || event.description == null) return;
    if (state.status == CallUiStatus.ringingIncoming) {
      _log('offer-buffered-before-accept', {
        'callId': event.callId,
        'fromUserId': event.fromUserId,
      });
      _pendingOffer = event;
      return;
    }

    try {
      _log('offer-received', {
        'callId': event.callId,
        'fromUserId': event.fromUserId,
        'currentCallId': call.id,
        'hasPeer': _peer != null,
      });
      emit(state.copyWith(status: CallUiStatus.connecting, error: null));
      final peer = _peer ?? await _createPeer(call);
      await peer.setRemoteDescription(_descriptionFromJson(event.description!));
      final answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      final toUserId = event.fromUserId ?? _firstPeerId(call);
      if (toUserId != null) {
        _log('answer-send', {
          'callId': event.callId,
          'toUserId': toUserId,
          'signalingState': '${peer.signalingState}',
        });
        final relayed = await socialSocketService.emitCallAnswer(
          callId: event.callId,
          toUserId: toUserId,
          description: _descriptionToJson(answer),
        );
        _log('answer-send-ack', {
          'callId': event.callId,
          'toUserId': toUserId,
          'ok': relayed,
        });
      }
      await _flushPendingIceCandidates();
      emit(state.copyWith(status: CallUiStatus.active));
    } catch (error) {
      emit(
        state.copyWith(error: _friendlyError(error, 'Could not answer call.')),
      );
    }
  }

  Future<void> _handleAnswer(SocialCallSignalEvent event) async {
    if (event.description == null || _peer == null) return;
    try {
      _log('answer-received', {
        'callId': event.callId,
        'fromUserId': event.fromUserId,
        'signalingState': '${_peer!.signalingState}',
      });
      await _peer!.setRemoteDescription(
        _descriptionFromJson(event.description!),
      );
      await _flushPendingIceCandidates();
      emit(state.copyWith(status: CallUiStatus.active));
    } catch (error) {
      emit(
        state.copyWith(error: _friendlyError(error, 'Could not connect call.')),
      );
    }
  }

  Future<void> _handleIceCandidate(SocialCallSignalEvent event) async {
    if (event.candidate == null) return;
    final remoteDescription = await _peer?.getRemoteDescription();
    if (remoteDescription == null) {
      _log('ice-candidate-buffered', {
        'callId': event.callId,
        'fromUserId': event.fromUserId,
        'candidate': _candidateSummary(event.candidate!),
      });
      _pendingIceCandidates.add(event);
      return;
    }
    _log('ice-candidate-add', {
      'callId': event.callId,
      'fromUserId': event.fromUserId,
      'candidate': _candidateSummary(event.candidate!),
    });
    await _peer?.addCandidate(_candidateFromJson(event.candidate!));
  }

  void _handleRemoteMediaState(SocialCallSignalEvent event) {
    final mediaState = event.mediaState;
    if (mediaState == null) return;
    emit(
      state.copyWith(
        remoteAudioEnabled:
            mediaState['audioEnabled'] == true ||
            mediaState['audioEnabled'] == null,
        remoteVideoEnabled:
            mediaState['videoEnabled'] == true ||
            mediaState['videoEnabled'] == null,
      ),
    );
  }

  Future<RTCPeerConnection> _createPeer(SocialCall call) async {
    await _closePeer();
    final localRenderer = await _ensureRenderer(state.localRenderer);
    final remoteRenderer = await _ensureRenderer(state.remoteRenderer);
    final stream = await _getLocalStream(call.mediaType);
    localRenderer.srcObject = stream;

    final peer = await createPeerConnection({
      'iceServers': _iceServers.map((server) => server.toJson()).toList(),
    });
    _peer = peer;
    _log('peer-created', {
      'callId': call.id,
      'mediaType': call.mediaType,
      'iceServerCount': _iceServers.length,
      'localTrackKinds': stream.getTracks().map((track) => track.kind).join(','),
    });

    for (final track in stream.getTracks()) {
      await peer.addTrack(track, stream);
    }
    peer.onTrack = (event) {
      _log('remote-track-received', {
        'callId': call.id,
        'trackKind': event.track.kind,
        'streamCount': event.streams.length,
        'streamTrackCounts': event.streams
            .map((stream) => stream.getTracks().length)
            .join(','),
      });
      if (event.streams.isEmpty) return;
      remoteRenderer.srcObject = event.streams.first;
      emit(state.copyWith(remoteRenderer: remoteRenderer));
    };
    peer.onIceCandidate = (candidate) {
      final toUserId = _firstPeerId(call);
      if (candidate.candidate == null) {
        _log('ice-gathering-complete', {'callId': call.id});
        return;
      }
      if (toUserId == null) {
        _log('ice-candidate-dropped-no-peer', {
          'callId': call.id,
          'candidate': _candidateSummary(_candidateToJson(candidate)),
        });
        return;
      }
      _log('ice-candidate-send', {
        'callId': call.id,
        'toUserId': toUserId,
        'candidate': _candidateSummary(_candidateToJson(candidate)),
      });
      unawaited(
        socialSocketService.emitCallIceCandidate(
          callId: call.id,
          toUserId: toUserId,
          candidate: _candidateToJson(candidate),
        ).then(
          (relayed) => _log('ice-candidate-send-ack', {
            'callId': call.id,
            'toUserId': toUserId,
            'ok': relayed,
          }),
        ),
      );
    };
    peer.onIceConnectionState = (connectionState) {
      _log('ice-connection-state', {
        'callId': call.id,
        'state': '$connectionState',
      });
    };
    peer.onConnectionState = (connectionState) {
      _log('peer-connection-state', {
        'callId': call.id,
        'state': '$connectionState',
      });
    };
    peer.onSignalingState = (signalingState) {
      _log('signaling-state', {
        'callId': call.id,
        'state': '$signalingState',
      });
    };

    emit(
      state.copyWith(
        localRenderer: localRenderer,
        remoteRenderer: remoteRenderer,
        audioEnabled: true,
        videoEnabled: call.isVideo,
      ),
    );
    return peer;
  }

  Future<void> _sendOfferToPeer(SocialCall call, String toUserId) async {
    final peer = _peer ?? await _createPeer(call);
    final offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    _log('offer-send-participant-joined', {
      'callId': call.id,
      'toUserId': toUserId,
      'signalingState': '${peer.signalingState}',
    });
    final relayed = await socialSocketService.emitCallOffer(
      callId: call.id,
      toUserId: toUserId,
      description: _descriptionToJson(offer),
    );
    _log('offer-send-ack', {
      'callId': call.id,
      'toUserId': toUserId,
      'ok': relayed,
    });
  }

  Future<RTCVideoRenderer> _ensureRenderer(RTCVideoRenderer? current) async {
    if (current != null) return current;
    final renderer = RTCVideoRenderer();
    await renderer.initialize();
    return renderer;
  }

  Future<MediaStream> _getLocalStream(String mediaType) async {
    if (_localStream != null) return _localStream!;
    final stream = await navigator.mediaDevices.getUserMedia({
      'audio': true,
      'video': mediaType == 'VIDEO' ? {'facingMode': 'user'} : false,
    });
    _localStream = stream;
    return stream;
  }

  Future<void> _sendMediaState({
    required bool audioEnabled,
    required bool videoEnabled,
  }) async {
    final call = state.call;
    final toUserId = call == null ? null : _firstPeerId(call);
    if (call == null || toUserId == null) return;
    final relayed = await socialSocketService.emitCallMediaState(
      callId: call.id,
      toUserId: toUserId,
      audioEnabled: audioEnabled,
      videoEnabled: videoEnabled,
    );
    _log('media-state-send-ack', {
      'callId': call.id,
      'toUserId': toUserId,
      'ok': relayed,
      'audioEnabled': audioEnabled,
      'videoEnabled': videoEnabled,
    });
  }

  Future<void> _flushPendingIceCandidates() async {
    final peer = _peer;
    if (peer == null || _pendingIceCandidates.isEmpty) return;
    final pending = List<SocialCallSignalEvent>.from(_pendingIceCandidates);
    _pendingIceCandidates.clear();
    for (final event in pending) {
      final candidate = event.candidate;
      if (candidate != null) {
        await peer.addCandidate(_candidateFromJson(candidate));
      }
    }
  }

  String? _firstPeerId(SocialCall call) {
    final ids = call.activePeerIds(currentUserId);
    return ids.isEmpty ? null : ids.first;
  }

  Future<void> _cleanupMedia() async {
    await _closePeer();
    for (final track in _localStream?.getTracks() ?? <MediaStreamTrack>[]) {
      await track.stop();
    }
    _localStream = null;
    state.localRenderer?.srcObject = null;
    state.remoteRenderer?.srcObject = null;
    _pendingIceCandidates.clear();
  }

  Future<void> _closePeer() async {
    await _peer?.close();
    _peer = null;
  }

  RTCSessionDescription _descriptionFromJson(Map<String, dynamic> json) =>
      RTCSessionDescription(json['sdp']?.toString(), json['type']?.toString());

  Map<String, dynamic> _descriptionToJson(RTCSessionDescription description) =>
      {'sdp': description.sdp, 'type': description.type};

  RTCIceCandidate _candidateFromJson(Map<String, dynamic> json) =>
      RTCIceCandidate(
        json['candidate']?.toString(),
        json['sdpMid']?.toString(),
        json['sdpMLineIndex'] is int
            ? json['sdpMLineIndex'] as int
            : int.tryParse('${json['sdpMLineIndex']}'),
      );

  Map<String, dynamic> _candidateToJson(RTCIceCandidate candidate) => {
    'candidate': candidate.candidate,
    'sdpMid': candidate.sdpMid,
    'sdpMLineIndex': candidate.sdpMLineIndex,
  };

  String _candidateSummary(Map<String, dynamic> candidate) {
    final raw = candidate['candidate']?.toString() ?? '';
    final typeMatch = RegExp(r' typ ([a-zA-Z0-9]+)').firstMatch(raw);
    final protocolMatch = RegExp(r' (udp|tcp) ', caseSensitive: false)
        .firstMatch(raw);
    return [
      'mid=${candidate['sdpMid']}',
      'mLine=${candidate['sdpMLineIndex']}',
      'type=${typeMatch?.group(1) ?? 'unknown'}',
      'protocol=${protocolMatch?.group(1) ?? 'unknown'}',
    ].join(' ');
  }

  void _log(String event, Map<String, Object?> payload) {
    if (!kDebugMode) return;
    debugPrint('[social-call] ${DateTime.now().toIso8601String()} '
        'event=$event ${payload.entries.map((entry) => '${entry.key}=${entry.value}').join(' ')}');
  }

  String _friendlyError(Object error, String fallback) {
    final message = error.toString();
    return message.isEmpty ? fallback : message;
  }

  @override
  Future<void> close() async {
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    await _cleanupMedia();
    await state.localRenderer?.dispose();
    await state.remoteRenderer?.dispose();
    return super.close();
  }
}
