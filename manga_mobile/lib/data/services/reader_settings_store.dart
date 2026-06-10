import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ReaderSettings {
  const ReaderSettings({
    this.paged = false,
    this.contain = false,
    this.dataSaver = true,
  });

  final bool paged;
  final bool contain;
  final bool dataSaver;
}

class ReaderSettingsStore {
  ReaderSettingsStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _pagedKey = 'manga.reader.paged';
  static const _containKey = 'manga.reader.contain';
  static const _dataSaverKey = 'manga.reader.dataSaver';

  final FlutterSecureStorage _storage;

  Future<ReaderSettings> readSettings() async => ReaderSettings(
    paged: await _readBool(_pagedKey, fallback: false),
    contain: await _readBool(_containKey, fallback: false),
    dataSaver: await _readBool(_dataSaverKey, fallback: true),
  );

  Future<void> saveSettings(ReaderSettings settings) async {
    await Future.wait([
      _writeBool(_pagedKey, settings.paged),
      _writeBool(_containKey, settings.contain),
      _writeBool(_dataSaverKey, settings.dataSaver),
    ]);
  }

  Future<bool> _readBool(String key, {required bool fallback}) async {
    final value = await _storage.read(key: key);
    return switch (value) {
      'true' => true,
      'false' => false,
      _ => fallback,
    };
  }

  Future<void> _writeBool(String key, bool value) async {
    await _storage.write(key: key, value: value ? 'true' : 'false');
  }
}
