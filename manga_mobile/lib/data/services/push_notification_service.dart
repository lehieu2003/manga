import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'api_client.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (!PushNotificationService.isSupportedPlatform) return;
  await Firebase.initializeApp();
}

class PushNotificationService {
  PushNotificationService(this._apiClient);

  static const _channel = AndroidNotificationChannel(
    'manga_notifications',
    'Manga Cafe notifications',
    description: 'Comments, social updates, messages, and calls.',
    importance: Importance.high,
  );

  final ApiClient _apiClient;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  final _routeController = StreamController<String>.broadcast();

  FirebaseMessaging? _messaging;
  String? _lastRegisteredToken;
  bool _initialized = false;

  Stream<String> get routeRequests => _routeController.stream;

  static bool get isSupportedPlatform {
    return !kIsWeb && defaultTargetPlatform == TargetPlatform.android;
  }

  Future<void> initialize() async {
    if (_initialized || !isSupportedPlatform) return;

    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    _messaging = FirebaseMessaging.instance;

    await _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(_channel);

    await _localNotifications.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      ),
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload == null || payload.isEmpty) return;
        final data = jsonDecode(payload);
        if (data is Map) {
          _emitRoute(routeFromData(_stringMap(data)));
        }
      },
    );

    FirebaseMessaging.onMessage.listen(_showForegroundNotification);
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      _emitRoute(routeFromData(_stringMap(message.data)));
    });

    final initialMessage = await _messaging?.getInitialMessage();
    if (initialMessage != null) {
      _emitRoute(routeFromData(_stringMap(initialMessage.data)));
    }

    _messaging?.onTokenRefresh.listen((token) {
      _registerToken(token);
    });

    _initialized = true;
  }

  Future<void> onSignedIn() async {
    if (!isSupportedPlatform) return;
    await initialize();
    final messaging = _messaging;
    if (messaging == null) return;
    final settings = await messaging.requestPermission();
    debugPrint(
      'Push notifications permission: ${settings.authorizationStatus.name}',
    );
    final token = await messaging.getToken();
    debugPrint(
      token == null
          ? 'Push notifications FCM token is null'
          : 'Push notifications FCM token acquired',
    );
    if (token != null) await _registerToken(token);
  }

  Future<void> onSignedOut() async {
    if (!isSupportedPlatform) return;
    final token = _lastRegisteredToken ?? await _messaging?.getToken();
    if (token == null) return;

    try {
      await _apiClient.post('/push-tokens/unregister', {
        'token': token,
      }, (json) => json);
    } finally {
      _lastRegisteredToken = null;
    }
  }

  Future<void> dispose() async {
    await _routeController.close();
  }

  Future<void> _registerToken(String token) async {
    try {
      await _apiClient.post('/push-tokens', {
        'token': token,
        'platform': 'android',
      }, (json) => json);
      _lastRegisteredToken = token;
      debugPrint('Push notifications token registered with backend');
    } catch (error) {
      debugPrint('Push notifications token registration failed: $error');
    }
  }

  Future<void> _showForegroundNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    await _localNotifications.show(
      id: notification.hashCode,
      title: notification.title,
      body: notification.body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      payload: jsonEncode(message.data),
    );
  }

  void _emitRoute(String? route) {
    if (route == null || route.isEmpty || _routeController.isClosed) return;
    _routeController.add(route);
  }

  static String? routeFromData(Map<String, String> data) {
    final targetType = data['targetType'];
    final targetId = data['targetId'];
    if (targetType == 'MANGA' && targetId != null && targetId.isNotEmpty) {
      return '/manga/$targetId';
    }
    if (targetType == 'CHAPTER' && targetId != null && targetId.isNotEmpty) {
      return '/read/$targetId';
    }

    final type = data['type'];
    final subjectType = data['subjectType'];
    if (type == 'FRIEND_REQUEST' ||
        type == 'FRIEND_ACCEPTED' ||
        type == 'GROUP_INVITE' ||
        type == 'CHAT_MESSAGE' ||
        type == 'INCOMING_CALL' ||
        type == 'MISSED_CALL' ||
        subjectType == 'CONVERSATION' ||
        subjectType == 'CALL') {
      return '/messages';
    }

    return null;
  }

  static Map<String, String> _stringMap(Map<dynamic, dynamic> data) {
    return data.map((key, value) => MapEntry('$key', '$value'));
  }
}
