import axios from "axios";
import {
  DashboardSummary,
  PatientsListResponse,
  PatientDetailResponse,
  SubgraphResponse,
} from "../types/api";
import { InvestigationReport } from "../types/investigation";
import {
  fetchMockDashboardSummary,
  fetchMockPatients,
  fetchMockPatientById,
  fetchMockInvestigationReport,
  fetchMockSubgraph,
} from "./mock-api";

// Configuration toggle: default to true unless explicitly disabled
const isMockEnabled =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_USE_MOCKS !== "false"
    : true;

const BASE_API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8000";

const http = axios.create({
  baseURL: BASE_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiClient = {
  isMock: () => isMockEnabled,

  async getDashboardSummary(): Promise<DashboardSummary> {
    if (isMockEnabled) {
      return fetchMockDashboardSummary();
    }
    try {
      const res = await http.get<DashboardSummary>("/api/dashboard/summary");
      return res.data;
    } catch {
      // Fallback gracefully to mock data if backend route is not yet deployed
      console.warn("Backend /api/dashboard/summary unavailable, falling back to mock data");
      return fetchMockDashboardSummary();
    }
  },

  async getPatients(): Promise<PatientsListResponse> {
    if (isMockEnabled) {
      return fetchMockPatients();
    }
    try {
      const res = await http.get<PatientsListResponse>("/api/patients");
      return res.data;
    } catch {
      console.warn("Backend /api/patients unavailable, falling back to mock data");
      return fetchMockPatients();
    }
  },

  async getPatientById(id: number): Promise<PatientDetailResponse | null> {
    if (isMockEnabled) {
      return fetchMockPatientById(id);
    }
    try {
      const res = await http.get<PatientDetailResponse>(`/api/patients/${id}`);
      return res.data;
    } catch {
      console.warn(`Backend /api/patients/${id} unavailable, falling back to mock data`);
      return fetchMockPatientById(id);
    }
  },

  async getInvestigationReport(patientId: number): Promise<InvestigationReport> {
    if (isMockEnabled) {
      return fetchMockInvestigationReport(patientId);
    }
    try {
      const res = await http.post<InvestigationReport>(`/api/investigate/${patientId}`);
      return res.data;
    } catch {
      console.warn(`Backend POST /api/investigate/${patientId} unavailable, falling back to mock data`);
      return fetchMockInvestigationReport(patientId);
    }
  },

  async getSubgraph(patientId: number): Promise<SubgraphResponse> {
    if (isMockEnabled) {
      return fetchMockSubgraph(patientId);
    }
    try {
      const res = await http.get<SubgraphResponse>(`/api/graph/subgraph/${patientId}`);
      return res.data;
    } catch {
      console.warn(`Backend /api/graph/subgraph/${patientId} unavailable, falling back to mock data`);
      return fetchMockSubgraph(patientId);
    }
  },
};
