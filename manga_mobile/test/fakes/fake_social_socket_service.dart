import 'dart:async';

import 'package:manga_mobile/data/services/social_socket_service.dart';
import 'package:manga_mobile/domain/models/models.dart';

class FakeSocialSocketService extends SocialSocketService {
  FakeSocialSocketService(super.api);

  final _messageNewController =
      StreamController<SocialMessageNewEvent>.broadcast();
  final _messageDeletedController =
      StreamController<SocialMessageDeletedEvent>.broadcast();
  final _readUpdatedController =
      StreamController<SocialReadUpdatedEvent>.broadcast();
  final _typingController = StreamController<SocialTypingEvent>.broadcast();
  final _memberController = StreamController<SocialMemberEvent>.broadcast();
  final _callIncomingController = StreamController<SocialCall>.broadcast();
  final _callOfferController =
      StreamController<SocialCallSignalEvent>.broadcast();
  final _callAnswerController =
      StreamController<SocialCallSignalEvent>.broadcast();
  final _callIceCandidateController =
      StreamController<SocialCallSignalEvent>.broadcast();
  final _callMediaStateController =
      StreamController<SocialCallSignalEvent>.broadcast();
  final _callParticipantJoinedController =
      StreamController<SocialCallParticipantJoinedEvent>.broadcast();
  final _callParticipantLeftController =
      StreamController<SocialCallParticipantLeftEvent>.broadcast();
  final _callEndedController =
      StreamController<SocialCallEndedEvent>.broadcast();
  final List<String> readMessageIds = [];
  final List<String> typingStarts = [];
  final List<String> typingStops = [];
  final List<Map<String, dynamic>> callSignals = [];

  @override
  Stream<SocialMessageNewEvent> get messageNew => _messageNewController.stream;

  @override
  Stream<SocialMessageDeletedEvent> get messageDeleted =>
      _messageDeletedController.stream;

  @override
  Stream<SocialReadUpdatedEvent> get readUpdated =>
      _readUpdatedController.stream;

  @override
  Stream<SocialTypingEvent> get typing => _typingController.stream;

  @override
  Stream<SocialMemberEvent> get memberChanged => _memberController.stream;

  @override
  Stream<SocialCall> get callIncoming => _callIncomingController.stream;

  @override
  Stream<SocialCallSignalEvent> get callOffer => _callOfferController.stream;

  @override
  Stream<SocialCallSignalEvent> get callAnswer => _callAnswerController.stream;

  @override
  Stream<SocialCallSignalEvent> get callIceCandidate =>
      _callIceCandidateController.stream;

  @override
  Stream<SocialCallSignalEvent> get callMediaState =>
      _callMediaStateController.stream;

  @override
  Stream<SocialCallParticipantJoinedEvent> get callParticipantJoined =>
      _callParticipantJoinedController.stream;

  @override
  Stream<SocialCallParticipantLeftEvent> get callParticipantLeft =>
      _callParticipantLeftController.stream;

  @override
  Stream<SocialCallEndedEvent> get callEnded => _callEndedController.stream;

  @override
  Future<void> connect() async {}

  @override
  Future<bool> markMessageRead({
    required String conversationId,
    required String lastMessageId,
  }) async {
    readMessageIds.add(lastMessageId);
    return true;
  }

  void emitMessageNew(SocialMessage message) {
    _messageNewController.add(
      SocialMessageNewEvent(
        conversationId: message.conversationId,
        message: message,
      ),
    );
  }

  void emitTyping({
    required String conversationId,
    required SocialUser user,
    required bool typing,
  }) {
    _typingController.add(
      SocialTypingEvent(
        conversationId: conversationId,
        user: user,
        typing: typing,
      ),
    );
  }

  void emitIncomingCall(SocialCall call) {
    _callIncomingController.add(call);
  }

  @override
  Future<bool> emitCallOffer({
    required String callId,
    required String toUserId,
    required Map<String, dynamic> description,
  }) async {
    callSignals.add({
      'event': 'call:offer',
      'callId': callId,
      'toUserId': toUserId,
      'description': description,
    });
    return true;
  }

  @override
  Future<bool> emitCallAnswer({
    required String callId,
    required String toUserId,
    required Map<String, dynamic> description,
  }) async {
    callSignals.add({
      'event': 'call:answer',
      'callId': callId,
      'toUserId': toUserId,
      'description': description,
    });
    return true;
  }

  @override
  Future<bool> emitCallIceCandidate({
    required String callId,
    required String toUserId,
    required Map<String, dynamic> candidate,
  }) async {
    callSignals.add({
      'event': 'call:ice-candidate',
      'callId': callId,
      'toUserId': toUserId,
      'candidate': candidate,
    });
    return true;
  }

  @override
  Future<bool> emitCallMediaState({
    required String callId,
    required String toUserId,
    required bool audioEnabled,
    required bool videoEnabled,
  }) async {
    callSignals.add({
      'event': 'call:media-state',
      'callId': callId,
      'toUserId': toUserId,
      'mediaState': {
        'audioEnabled': audioEnabled,
        'videoEnabled': videoEnabled,
      },
    });
    return true;
  }

  @override
  void emitTypingStart(String conversationId) {
    typingStarts.add(conversationId);
  }

  @override
  void emitTypingStop(String conversationId) {
    typingStops.add(conversationId);
  }

  @override
  Future<void> dispose() async {
    await Future.wait([
      _messageNewController.close(),
      _messageDeletedController.close(),
      _readUpdatedController.close(),
      _typingController.close(),
      _memberController.close(),
      _callIncomingController.close(),
      _callOfferController.close(),
      _callAnswerController.close(),
      _callIceCandidateController.close(),
      _callMediaStateController.close(),
      _callParticipantJoinedController.close(),
      _callParticipantLeftController.close(),
      _callEndedController.close(),
    ]);
  }
}
