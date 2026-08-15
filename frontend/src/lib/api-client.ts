/**
 * RogRakshak Investigation API Client.
 *
 * Axios-based abstraction over the FastAPI backend.
 * All investigation endpoints are typed against the backend contract.
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  InvestigationListResponse,
  InvestigationCase,
  CreateInvestigationRequest,
  EvidenceItem,
  InvestigationTimelineEntry,
  HealthResponse,
  PatientTimelineResponse,
} from "@/types/api";

// --- Error types ---

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

// --- Client factory ---

function createClient(): AxiosInstance {
  const baseURL =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      : "http://localhost:8000";

  return axios.create({
    baseURL,
    timeout: 60_000,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });
}

const client = createClient();

// Centralised error handler
function handleError(err: unknown): never {
  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 0;
    let detail = err.response?.data?.detail;

    if (!detail) {
      if (err.code === "ECONNABORTED" || (err.message && err.message.toLowerCase().includes("timeout"))) {
        detail = "The investigation service did not respond in time. Please try again or switch to Mock mode.";
      } else if (status === 0 || err.message === "Network Error") {
        detail = "Unable to connect to the surveillance server. Please ensure the backend service is reachable or switch to Mock mode.";
      } else if (status === 404) {
        detail = "The requested investigation case was not found.";
      } else if (status >= 500) {
        detail = "The investigation service encountered an internal error. Please try again.";
      } else {
        detail = err.message || "An unexpected network error occurred.";
      }
    }
    
    // Keep raw error logged in console for developers
    console.error("[RogRakshak API Error]", { status, original: err });
    throw new ApiError(status, String(detail));
  }
  throw err;
}

// --- Public API ---

export const investigationsApi = {
  /** GET /api/investigations */
  async list(): Promise<InvestigationListResponse> {
    try {
      const { data } = await client.get<InvestigationListResponse>(
        "/api/investigations"
      );
      return data;
    } catch (err) {
      return handleError(err);
    }
  },

  /** GET /api/investigations/{caseId} */
  async get(caseId: string): Promise<InvestigationCase> {
    try {
      const { data } = await client.get<InvestigationCase>(
        `/api/investigations/${encodeURIComponent(caseId)}`
      );
      return data;
    } catch (err) {
      return handleError(err);
    }
  },

  /** POST /api/investigations */
  async create(
    request: CreateInvestigationRequest
  ): Promise<InvestigationCase> {
    try {
      const { data } = await client.post<InvestigationCase>(
        "/api/investigations",
        request
      );
      return data;
    } catch (err) {
      return handleError(err);
    }
  },

  /** GET /api/investigations/{caseId}/evidence */
  async getEvidence(caseId: string): Promise<EvidenceItem[]> {
    try {
      const { data } = await client.get<EvidenceItem[]>(
        `/api/investigations/${encodeURIComponent(caseId)}/evidence`
      );
      return data;
    } catch (err) {
      return handleError(err);
    }
  },

  /** GET /api/investigations/{caseId}/timeline */
  async getTimeline(caseId: string): Promise<InvestigationTimelineEntry[]> {
    try {
      const { data } = await client.get<InvestigationTimelineEntry[]>(
        `/api/investigations/${encodeURIComponent(caseId)}/timeline`
      );
      return data;
    } catch (err) {
      return handleError(err);
    }
  },

  /** GET /health */
  async health(): Promise<HealthResponse> {
    try {
      const { data } = await client.get<HealthResponse>("/health");
      return data;
    } catch (err) {
      return handleError(err);
    }
  },
};

/**
 * Graph endpoints (/graph/*).
 *
 * Read-only. Used to enrich transmission-graph nodes with ward/bed placement,
 * which the investigation payload does not carry.
 */
export const graphApi = {
  /** GET /graph/patient/{id}/timeline */
  async getPatientTimeline(patientId: number): Promise<PatientTimelineResponse> {
    try {
      const { data } = await client.get<PatientTimelineResponse>(
        `/graph/patient/${patientId}/timeline`
      );
      return data;
    } catch (err) {
      return handleError(err);
    }
  },
};
