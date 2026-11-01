/**
 * Shared investigation list.
 *
 * Every signed-in page needs the case list, and on a cold backend the first
 * request can take a while (the default case is generated on demand). Holding
 * it here means the app shell's warm-up request and the page that renders
 * underneath it share one in-flight request instead of racing two, and
 * navigating between pages does not refetch.
 *
 * Nothing is cached across a data-source switch: the list is keyed to the mode
 * it was loaded in and reloaded when that changes.
 */

import { create } from "zustand";
import type { InvestigationCase } from "@/types/api";
import { getProvider } from "@/lib/data-provider";
import { useAppStore, type DataMode } from "@/lib/store";
import { describeError } from "@/lib/api-client";

export type LoadStatus = "idle" | "loading" | "ready" | "error";

interface CasesState {
  cases: InvestigationCase[];
  status: LoadStatus;
  error: string | null;
  /** When the current request started — drives the cold-start message. */
  startedAt: number | null;
  loadedMode: DataMode | null;
  /** Loads once per mode; `force` refetches. Concurrent calls share a request. */
  load: (opts?: { force?: boolean }) => Promise<void>;
  /** Insert or replace a case after a create / re-run, newest first. */
  upsert: (c: InvestigationCase) => void;
}

let inflight: { mode: DataMode; token: object; promise: Promise<void> } | null = null;

export const useCasesStore = create<CasesState>((set, get) => ({
  cases: [],
  status: "idle",
  error: null,
  startedAt: null,
  loadedMode: null,

  load: async ({ force = false } = {}) => {
    const mode = useAppStore.getState().mode;
    const { status, loadedMode } = get();

    if (inflight && inflight.mode === mode) return inflight.promise;
    if (!force && status === "ready" && loadedMode === mode) return;

    set({ status: "loading", error: null, startedAt: Date.now() });

    const token = {};
    const run = async () => {
      try {
        const resp = await getProvider().list();
        // A mode switch mid-request makes this response stale.
        if (useAppStore.getState().mode !== mode) return;
        set({
          cases: resp.cases,
          status: "ready",
          loadedMode: mode,
          startedAt: null,
        });
      } catch (err) {
        if (useAppStore.getState().mode !== mode) return;
        set({ status: "error", error: describeError(err), startedAt: null });
      } finally {
        if (inflight?.token === token) inflight = null;
      }
    };

    const promise = run();
    inflight = { mode, token, promise };
    return promise;
  },

  upsert: (c) =>
    set((s) => ({
      cases: [c, ...s.cases.filter((x) => x.case_id !== c.case_id)],
    })),
}));

/** Reload whenever the data source changes. */
useAppStore.subscribe((state, prev) => {
  if (state.mode !== prev.mode) {
    useCasesStore.setState({ cases: [], status: "idle", loadedMode: null });
    void useCasesStore.getState().load();
  }
});
