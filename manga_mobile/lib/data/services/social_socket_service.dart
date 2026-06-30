import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../domain/models/models.dart';
import 'api_client.dart';

class SocialMessageNewEvent {
  const SocialMessageNewEvent({
    required this.conversationId,
    required this.message,
  });

  final String conversationId;
  final SocialMessage message;
}

class SocialMessageDeletedEvent {
  const SocialMessageDeletedEvent({
    required this.conversationId,
    required this.messageId,
  });

  final String conversationId;
  final String messageId;
}

class SocialReadUpdatedEvent {
  const SocialReadUpdatedEvent({
    required this.conversationId,
    required this.userId,
    required this.lastReadMessageId,
    required this.lastReadAt,
  });

  final String conversationId;
  final String userId;
  final String lastReadMessageId;
  final DateTime? lastReadAt;
}

class SocialTypingEvent {
  const SocialTypingEvent({
    required this.conversationId,
    required this.user,
    required this.typing,
  });

  final String conversationId;
  final SocialUser user;
  final bool typing;
}

class SocialMemberEvent {
  const SocialMemberEvent({required this.conversationId, required this.userId});

  final String conversationId;
  final String userId;
}

class SocialSocketService {
  SocialSocketService(this._apiClient);

  final ApiClient _apiClient;
  io.Socket? _socket;

  final _messageNewController =
      StreamController<SocialMessageNewEvent>.broadcast();
  final _messageDeletedController =
      StreamController<SocialMessageDeletedEvent>.broadcast();
  final _readUpdatedController =
      StreamController<SocialReadUpdatedEvent>.broadcast();
  final _typingController = StreamController<SocialTypingEvent>.broadcast();
  final _memberController = StreamController<SocialMemberEvent>.broadcast();

  Stream<SocialMessageNewEvent> get messageNew => _messageNewController.stream;
  Stream<SocialMessageDeletedEvent> get messageDeleted =>
      _messageDeletedController.stream;
  Stream<SocialReadUpdatedEvent> get readUpdated =>
      _readUpdatedController.stream;
  Stream<SocialTypingEvent> get typing => _typingController.stream;
  Stream<SocialMemberEvent> get memberChanged => _memberController.stream;

  bool get isConnected => _socket?.connected == true;

  Future<void> connect() async {
    final existing = _socket;
    if (existing?.connected == true) return;

    existing?.dispose();
    final origin = Uri.parse(_apiClient.baseUrl).origin;
    final socket = io.io(
      origin,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableReconnection()
          .setReconnectionAttempts(6)
          .setReconnectionDelay(700)
          .setAuthFn((callback) async {
            callback({'token': await _apiClient.tokenStore.accessToken});
          })
          .disableAutoConnect()
          .build(),
    );
    _socket = socket;
    _bindSocket(socket);
    socket.connect();
  }

  Future<bool> markMessageRead({
    required String conversationId,
    required String lastMessageId,
  }) async {
    final socket = _socket;
    if (socket?.connected != true) return false;

    try {
      final ack = await socket!.emitWithAckAsync('message:read', {
        'conversationId': conversationId,
        'lastMessageId': lastMessageId,
      });
      return ack is Map && ack['ok'] == true;
    } catch (_) {
      return false;
    }
  }

  void emitTypingStart(String conversationId) {
    _socket?.emit('typing:start', {'conversationId': conversationId});
  }

  void emitTypingStop(String conversationId) {
    _socket?.emit('typing:stop', {'conversationId': conversationId});
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  Future<void> dispose() async {
    disconnect();
    await Future.wait([
      _messageNewController.close(),
      _messageDeletedController.close(),
      _readUpdatedController.close(),
      _typingController.close(),
      _memberController.close(),
    ]);
  }

  void _bindSocket(io.Socket socket) {
    socket.on('message:new', (payload) {
      final json = _asMap(payload);
      if (json == null) return;
      final messageJson = _asMap(json['message']);
      if (messageJson == null) return;
      _messageNewController.add(
        SocialMessageNewEvent(
          conversationId: json['conversationId']?.toString() ?? '',
          message: SocialMessage.fromJson(messageJson),
        ),
      );
    });

    socket.on('message:deleted', (payload) {
      final json = _asMap(payload);
      if (json == null) return;
      _messageDeletedController.add(
        SocialMessageDeletedEvent(
          conversationId: json['conversationId']?.toString() ?? '',
          messageId: json['messageId']?.toString() ?? '',
        ),
      );
    });

    socket.on('read:updated', (payload) {
      final json = _asMap(payload);
      if (json == null) return;
      _readUpdatedController.add(
        SocialReadUpdatedEvent(
          conversationId: json['conversationId']?.toString() ?? '',
          userId: json['userId']?.toString() ?? '',
          lastReadMessageId: json['lastReadMessageId']?.toString() ?? '',
          lastReadAt: DateTime.tryParse(json['lastReadAt']?.toString() ?? ''),
        ),
      );
    });

    socket.on('typing:indicator', (payload) {
      final json = _asMap(payload);
      final userJson = _asMap(json?['user']);
      if (json == null || userJson == null) return;
      _typingController.add(
        SocialTypingEvent(
          conversationId: json['conversationId']?.toString() ?? '',
          user: SocialUser.fromJson(userJson),
          typing: json['typing'] == true,
        ),
      );
    });

    void handleMemberChanged(Object? payload) {
      final json = _asMap(payload);
      if (json == null) return;
      final memberJson = _asMap(json['member']);
      _memberController.add(
        SocialMemberEvent(
          conversationId: json['conversationId']?.toString() ?? '',
          userId:
              memberJson?['userId']?.toString() ??
              json['userId']?.toString() ??
              '',
        ),
      );
    }

    socket.on('member:invited', handleMemberChanged);
    socket.on('member:added', handleMemberChanged);
    socket.on('member:removed', handleMemberChanged);
  }

  Map<String, dynamic>? _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((key, value) => MapEntry(key.toString(), value));
    }
    return null;
  }
}
