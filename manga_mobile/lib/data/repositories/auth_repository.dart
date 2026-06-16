import '../../domain/models/models.dart';
import '../services/api_client.dart';
import '../services/token_store.dart';

class AuthRepository {
  AuthRepository(this._api);

  final ApiClient _api;

  Future<User?> restoreSession() async {
    if (await _api.tokenStore.accessToken == null) return null;
    try {
      final payload = await _api.get('/me', (json) => json);
      return User.fromJson(payload['user'] as Map<String, dynamic>);
    } catch (_) {
      await _api.tokenStore.clear();
      return null;
    }
  }

  Future<User> login({required String email, required String password}) {
    return _auth('/auth/login', {'email': email, 'password': password});
  }

  Future<User> register({
    required String email,
    required String password,
    required String displayName,
  }) {
    return _auth('/auth/register', {
      'email': email,
      'password': password,
      'displayName': displayName,
    });
  }

  Future<User> updateProfile({String? displayName, String? avatarUrl}) async {
    final payload = await _api.patch('/me', {
      if (displayName != null) 'displayName': displayName,
      'avatarUrl': avatarUrl,
    }, (json) => json);
    return User.fromJson(payload['user'] as Map<String, dynamic>);
  }

  Future<User> changePassword({
    required String currentPassword,
    required String newPassword,
  }) {
    return _auth('/me/password', {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    }, method: 'PUT');
  }

  Future<void> logout() async {
    final refreshToken = await _api.tokenStore.refreshToken;
    try {
      if (refreshToken != null) {
        await _api.post(
          '/auth/logout',
          {'refreshToken': refreshToken},
          (json) => json,
          allowRefresh: false,
        );
      }
    } finally {
      await _api.tokenStore.clear();
    }
  }

  Future<User> _auth(
    String path,
    Map<String, dynamic> body, {
    String method = 'POST',
  }) async {
    final payload = await _api.request(
      path,
      method: method,
      body: body,
      decode: (json) => json,
    );
    await _api.tokenStore.save(
      TokenPair(
        accessToken: payload['accessToken'] as String,
        refreshToken: payload['refreshToken'] as String,
      ),
    );
    return User.fromJson(payload['user'] as Map<String, dynamic>);
  }
}
