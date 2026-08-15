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
    timeout: 30_000,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });
}

const client = createClient();

// Centralised error handler
function handleError(err: unknown): never {
  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 0;
    const detail =
      err.response?.data?.detail ??
      err.message ??
      "An unexpected network error occurred";
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
