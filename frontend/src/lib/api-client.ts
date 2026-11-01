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
  PatientListResponse,
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

/**
 * The backend can be cold: on a sleeping host the first request has to boot
 * the service and generate the default case, which can take most of a minute.
 * Reads get 90s and one automatic retry on timeout or network failure; the
 * investigation POST runs the whole workflow, so it gets longer and is never
 * retried automatically (a retry would run it twice).
 */
export const READ_TIMEOUT_MS = 90_000;
export const RUN_TIMEOUT_MS = 150_000;

export const API_BASE_URL =
  // NEXT_PUBLIC_* is inlined at build time. The localhost fallback is a dev
  // convenience only — every deployed environment must set NEXT_PUBLIC_API_URL.
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: API_BASE_URL,
    timeout: READ_TIMEOUT_MS,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
  });
}

const client = createClient();

/** Timeouts and dropped connections are worth one retry; HTTP errors are not. */
function isTransient(err: unknown): boolean {
  return (
    err instanceof AxiosError &&
    !err.response &&
    err.code !== AxiosError.ERR_CANCELED
  );
}

async function getWithRetry<T>(url: string): Promise<T> {
  try {
    return (await client.get<T>(url)).data;
  } catch (err) {
    if (!isTransient(err)) throw err;
    return (await client.get<T>(url)).data;
  }
}

// Centralised error handler
function handleError(err: unknown): never {
  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 0;
    let detail: string;
    if (err.response?.data?.detail) {
      detail = String(err.response.data.detail);
    } else if (err.code === AxiosError.ECONNABORTED || err.code === "ETIMEDOUT") {
      detail = "The analysis service did not respond in time.";
    } else if (!err.response) {
      detail = `Could not reach the analysis service at ${API_BASE_URL}.`;
    } else {
      detail = err.message || "An unexpected network error occurred.";
    }
    throw new ApiError(status, detail);
  }
  throw err;
}

/** A sentence a person can act on, for any error thrown by this module. */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.detail;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

// --- Public API ---

export const investigationsApi = {
  /** GET /api/investigations */
  async list(): Promise<InvestigationListResponse> {
    try {
      return await getWithRetry<InvestigationListResponse>("/api/investigations");
    } catch (err) {
      return handleError(err);
    }
  },

  /** GET /api/investigations/{caseId} */
  async get(caseId: string): Promise<InvestigationCase> {
    try {
      return await getWithRetry<InvestigationCase>(`/api/investigations/${encodeURIComponent(caseId)}`);
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
        request,
        { timeout: RUN_TIMEOUT_MS }
      );
      return data;
    } catch (err) {
      return handleError(err);
    }
  },

  /** GET /api/investigations/{caseId}/evidence */
  async getEvidence(caseId: string): Promise<EvidenceItem[]> {
    try {
      return await getWithRetry<EvidenceItem[]>(`/api/investigations/${encodeURIComponent(caseId)}/evidence`);
    } catch (err) {
      return handleError(err);
    }
  },

  /** GET /api/investigations/{caseId}/timeline */
  async getTimeline(caseId: string): Promise<InvestigationTimelineEntry[]> {
    try {
      return await getWithRetry<InvestigationTimelineEntry[]>(`/api/investigations/${encodeURIComponent(caseId)}/timeline`);
    } catch (err) {
      return handleError(err);
    }
  },

  /** GET /health */
  async health(): Promise<HealthResponse> {
    try {
      return await getWithRetry<HealthResponse>("/health");
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
  /** GET /graph/patients — every patient with their most recent culture. */
  async listPatients(): Promise<PatientListResponse> {
    try {
      return await getWithRetry<PatientListResponse>("/graph/patients");
    } catch (err) {
      return handleError(err);
    }
  },

  /** GET /graph/patient/{id}/timeline */
  async getPatientTimeline(patientId: number): Promise<PatientTimelineResponse> {
    try {
      return await getWithRetry<PatientTimelineResponse>(`/graph/patient/${patientId}/timeline`);
    } catch (err) {
      return handleError(err);
    }
  },
};
