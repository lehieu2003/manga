import 'package:manga_mobile/data/services/reader_settings_store.dart';

class FakeReaderSettingsStore extends ReaderSettingsStore {
  ReaderSettings saved = const ReaderSettings();

  @override
  Future<ReaderSettings> readSettings() async => saved;

  @override
  Future<void> saveSettings(ReaderSettings settings) async {
    saved = settings;
  }
}
