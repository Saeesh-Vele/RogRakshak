/**
 * Zustand Application Store.
 *
 * Manages:
 * - mock / live data-source mode
 * - mobile navigation drawer state
 */

import { create } from "zustand";

export type DataMode = "mock" | "live";

interface AppState {
  mode: DataMode;
  /** Mobile only: the sidebar is always visible from the md breakpoint up. */
  sidebarOpen: boolean;
  setMode: (mode: DataMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: "live",
  // Closed by default: on a phone an open drawer covers the page it was
  // supposed to lead to.
  sidebarOpen: false,
  setMode: (mode) => set({ mode }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
