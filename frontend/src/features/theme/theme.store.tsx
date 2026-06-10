import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppTheme = "dark" | "light";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "manga.theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [hasStoredPreference, setHasStoredPreference] = useState(() => getStoredTheme() !== null);
  const [theme, setThemeState] = useState<AppTheme>(() => getStoredTheme() ?? getSystemTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (hasStoredPreference || typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? "light" : "dark");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [hasStoredPreference]);

  const value = useMemo<ThemeContextValue>(() => {
    const setTheme = (nextTheme: AppTheme) => {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      setHasStoredPreference(true);
      setThemeState(nextTheme);
    };

    return {
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark")
    };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export function getStoredTheme(): AppTheme | null {
  if (typeof localStorage === "undefined") return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

function getSystemTheme(): AppTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}
