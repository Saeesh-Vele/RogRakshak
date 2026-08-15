/**
 * Unified Data Provider.
 *
 * Switches between mock and live API backends based on the Zustand store.
 * UI components import this module and never touch Axios or fixtures directly.
 */

import type {
  InvestigationListResponse,
  InvestigationCase,
  CreateInvestigationRequest,
  EvidenceItem,
  InvestigationTimelineEntry,
} from "@/types/api";
import { investigationsApi, ApiError } from "@/lib/api-client";
import { mockProvider } from "@/lib/mock-provider";
import { useAppStore } from "@/lib/store";

export interface DataProvider {
  list(): Promise<InvestigationListResponse>;
  get(caseId: string): Promise<InvestigationCase | null>;
  create(request: CreateInvestigationRequest): Promise<InvestigationCase>;
  getEvidence(caseId: string): Promise<EvidenceItem[]>;
  getTimeline(caseId: string): Promise<InvestigationTimelineEntry[]>;
}

const liveProvider: DataProvider = {
  list: () => investigationsApi.list(),
  get: async (caseId) => {
    try {
      return await investigationsApi.get(caseId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
  create: (req) => investigationsApi.create(req),
  getEvidence: (caseId) => investigationsApi.getEvidence(caseId),
  getTimeline: (caseId) => investigationsApi.getTimeline(caseId),
};

/** Returns the active provider based on current mode. */
export function getProvider(): DataProvider {
  const mode = useAppStore.getState().mode;
  return mode === "mock" ? mockProvider : liveProvider;
}

export { ApiError };
