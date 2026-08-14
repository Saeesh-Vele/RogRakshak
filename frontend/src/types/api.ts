import { Patient } from "./patient";
import { TemporalGraphResponse } from "./graph";

export interface DashboardSummary {
  activeCasesCount: number;
  potentialClustersCount: number;
  highPriorityContactsCount: number;
  flaggedLocationsCount: number;
  topOrganism: string;
  lastUpdated: string;
  flaggedLocationsList: {
    name: string;
    casesCount: number;
    risk: "High" | "Medium" | "Low";
  }[];
  recentAlerts: {
    id: string;
    timestamp: string;
    message: string;
    type: "critical" | "warning" | "info";
  }[];
}

export interface PatientsListResponse {
  total: number;
  patients: Patient[];
}

export interface PatientDetailResponse {
  patient: Patient;
}

export interface SubgraphResponse {
  patientId: number;
  graph: TemporalGraphResponse;
}

export interface SseAgentEvent {
  agent: string;
  status: "pending" | "running" | "complete" | "error";
  summary?: string;
  data?: Record<string, unknown>;
  error?: string;
}
