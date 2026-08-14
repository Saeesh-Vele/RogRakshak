import { DashboardSummary, PatientsListResponse, PatientDetailResponse, SubgraphResponse } from "../types/api";
import { InvestigationReport } from "../types/investigation";
import { mockDashboardSummary } from "../mocks/dashboard";
import { mockPatients } from "../mocks/patients";
import { mockInvestigationReport } from "../mocks/investigation";
import { mockTemporalGraph } from "../mocks/graph";

// Simulated network delay helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchMockDashboardSummary(): Promise<DashboardSummary> {
  await delay(150);
  return mockDashboardSummary;
}

export async function fetchMockPatients(): Promise<PatientsListResponse> {
  await delay(180);
  return {
    total: mockPatients.length,
    patients: mockPatients,
  };
}

export async function fetchMockPatientById(id: number): Promise<PatientDetailResponse | null> {
  await delay(150);
  const patient = mockPatients.find((p) => p.id === id);
  if (!patient) return null;
  return { patient };
}

export async function fetchMockInvestigationReport(patientId: number): Promise<InvestigationReport> {
  await delay(200);
  // Default to index report with matching ID
  return {
    ...mockInvestigationReport,
    patientId,
  };
}

export async function fetchMockSubgraph(patientId: number): Promise<SubgraphResponse> {
  await delay(150);
  return {
    patientId,
    graph: mockTemporalGraph,
  };
}
