/**
 * Zustand Application Store.
 *
 * Manages:
 * - mock / live mode toggle
 * - sidebar open state
 * - light / dark theme for the signed-in application
 */

import { create } from "zustand";

export type DataMode = "mock" | "live";
export type Theme = "light" | "dark";

/**
 * Read by the blocking script in the root layout as well, so the two must
 * agree. Keep them in sync if this ever changes.
 */
export const THEME_STORAGE_KEY = "rograkshak-theme";

/**
 * The theme applies to the authenticated app only — the landing and auth
 * screens pin themselves to light via data-theme, so this never reaches them.
 */
function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    // Private mode or blocked storage — fall back rather than throw.
    return "light";
  }
}

interface AppState {
  mode: DataMode;
  sidebarOpen: boolean;
  theme: Theme;
  setMode: (mode: DataMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Writes the theme to <html data-theme> and to storage. The attribute is what
 * the token blocks in globals.css key off; the storage entry is what the
 * blocking script replays on the next load so the page never flashes.
 */
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Preference simply will not persist; the current session still works.
  }
}

export const useAppStore = create<AppState>((set) => ({
  mode: "live",
  sidebarOpen: true,
  // Server render always starts light; ThemeToggle reconciles on mount.
  theme: "light",
  setMode: (mode) => set({ mode }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      return { theme: next };
    }),
}));

export { readStoredTheme };
