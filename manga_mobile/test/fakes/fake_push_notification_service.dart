import 'dart:async';

import 'package:manga_mobile/data/services/push_notification_service.dart';

class FakePushNotificationService extends PushNotificationService {
  FakePushNotificationService(super.api);

  final _routeController = StreamController<String>.broadcast();
  int signedInCount = 0;
  int signedOutCount = 0;

  @override
  Stream<String> get routeRequests => _routeController.stream;

  @override
  Future<void> initialize() async {}

  @override
  Future<void> onSignedIn() async {
    signedInCount += 1;
  }

  @override
  Future<void> onSignedOut() async {
    signedOutCount += 1;
  }

  void emitRoute(String route) {
    _routeController.add(route);
  }

  @override
  Future<void> dispose() async {
    await _routeController.close();
  }
}
