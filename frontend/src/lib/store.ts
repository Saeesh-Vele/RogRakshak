/**
 * Zustand Application Store.
 *
 * Manages:
 * - mock / live mode toggle
 * - sidebar open state
 */

import { create } from "zustand";

export type DataMode = "mock" | "live";

interface AppState {
  mode: DataMode;
  sidebarOpen: boolean;
  setMode: (mode: DataMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: "live",
  sidebarOpen: true,
  setMode: (mode) => set({ mode }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
