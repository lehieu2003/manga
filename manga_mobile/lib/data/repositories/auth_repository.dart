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

  Future<User?> register({
    required String email,
    required String password,
    required String displayName,
  }) async {
    final payload = await _api.post('/auth/register', {
      'email': email,
      'password': password,
      'displayName': displayName,
    }, (json) => json);

    final accessToken = payload['accessToken'] as String?;
    final refreshToken = payload['refreshToken'] as String?;
    if (accessToken != null && refreshToken != null) {
      await _api.tokenStore.save(
        TokenPair(accessToken: accessToken, refreshToken: refreshToken),
      );
    }

    final userJson = payload['user'] as Map<String, dynamic>?;
    return userJson == null ? null : User.fromJson(userJson);
  }

  Future<void> verifyEmail({required String email, required String code}) {
    return _api.post('/auth/email/verify', {
      'email': email,
      'code': code,
    }, (json) => json);
  }

  Future<void> resendVerificationEmail({required String email}) {
    return _api.post('/auth/email/verification', {
      'email': email,
    }, (json) => json);
  }

  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) {
    return _api.post('/auth/password/reset', {
      'token': token,
      'newPassword': newPassword,
    }, (json) => json);
  }

  Future<void> forgotPassword({required String email}) {
    return _api.post('/auth/password/forgot', {'email': email}, (json) => json);
  }

  Future<User> updateProfile({String? displayName, String? avatarUrl}) async {
    final payload = await _api.patch('/me', {
      if (displayName != null) 'displayName': displayName,
      'avatarUrl': avatarUrl,
    }, (json) => json);
    return User.fromJson(payload['user'] as Map<String, dynamic>);
  }

  Future<User> uploadAvatar(String filePath) async {
    final payload = await _api.multipart(
      '/me/avatar',
      fieldName: 'avatar',
      filePath: filePath,
      decode: (json) => json,
    );
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

    final accessToken = payload['accessToken'] as String?;
    final refreshToken = payload['refreshToken'] as String?;
    if (accessToken != null && refreshToken != null) {
      await _api.tokenStore.save(
        TokenPair(accessToken: accessToken, refreshToken: refreshToken),
      );
    }

    return User.fromJson(payload['user'] as Map<String, dynamic>);
  }
}
