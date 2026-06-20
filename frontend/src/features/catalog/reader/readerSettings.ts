import type { ReaderFit, ReaderMode, ReaderNavigationDirection, ReaderQuality } from "./reader.types";

export const READER_SETTINGS_STORAGE_KEY = "manga.reader.settings";

export type ReaderSettings = {
  mode: ReaderMode;
  fit: ReaderFit;
  quality: ReaderQuality;
  navigationDirection: ReaderNavigationDirection;
};

export const defaultReaderSettings: ReaderSettings = {
  mode: "vertical",
  fit: "width",
  quality: "data-saver",
  navigationDirection: "ltr"
};

export function readReaderSettings(): ReaderSettings {
  if (typeof localStorage === "undefined") return defaultReaderSettings;
  const stored = localStorage.getItem(READER_SETTINGS_STORAGE_KEY);
  if (!stored) return defaultReaderSettings;
  try {
    const parsed = JSON.parse(stored) as Partial<ReaderSettings>;
    return {
      mode: parsed.mode === "paged" || parsed.mode === "vertical" ? parsed.mode : defaultReaderSettings.mode,
      fit: parsed.fit === "contain" || parsed.fit === "width" ? parsed.fit : defaultReaderSettings.fit,
      quality: parsed.quality === "original" || parsed.quality === "data-saver" ? parsed.quality : defaultReaderSettings.quality,
      navigationDirection: parsed.navigationDirection === "rtl" || parsed.navigationDirection === "ltr" ? parsed.navigationDirection : defaultReaderSettings.navigationDirection
    };
  } catch {
    return defaultReaderSettings;
  }
}

export function writeReaderSettings(settings: ReaderSettings) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
