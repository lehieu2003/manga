import 'package:manga_mobile/data/repositories/repositories.dart';
import 'package:manga_mobile/domain/models/models.dart';

class FakeAuthRepository extends AuthRepository {
  FakeAuthRepository(super.api, this._user);

  final User _user;

  @override
  Future<User?> restoreSession() async => _user;

  @override
  Future<User> updateProfile({String? displayName, String? avatarUrl}) async =>
      _user;

  @override
  Future<User> uploadAvatar(String filePath) async => _user;

  @override
  Future<User> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async => _user;

  @override
  Future<void> logout() async {}
}
