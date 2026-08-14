import { PriorityLevel, ResistanceProfile } from "./patient";
import { TemporalGraphResponse } from "./graph";

export type AgentStageName = "case" | "timeline" | "contact" | "graph" | "risk" | "report";

export type AgentStatus = "pending" | "running" | "complete" | "error";

export interface AgentStageState {
  name: AgentStageName;
  displayName: string;
  status: AgentStatus;
  summary?: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface InvestigationEvidenceItem {
  id: string;
  category: "Staff Overlap" | "Ward Co-location" | "Organism Profile" | "Lab Result" | "Device Exposure";
  title: string;
  summary: string;
  confidence: number;
  source: string;
  details: Record<string, string | number | boolean | null>;
}

export interface RankedContact {
  id: string;
  rank: number;
  patientId?: number;
  name: string;
  mrn?: string;
  role?: string;
  connectionType: "Staff-mediated" | "Direct Ward Co-location" | "Bed Proximity" | "Procedure Transfer";
  mediator?: string;
  location: string;
  overlap: string;
  risk: PriorityLevel;
  organismStatus?: "Positive (Same Strain)" | "Pending Culture" | "Negative" | "Suspected";
  evidenceIds: string[];
}

export interface PotentialClusterFinding {
  hasCluster: boolean;
  clusterName: string;
  organism: string;
  resistance: ResistanceProfile;
  connectedPositivePatientsCount: number;
  confidence: number;
  primaryVector?: {
    name: string;
    role: string;
    shiftsCovered: string;
  };
  keyEvidenceSummary: string;
  reviewRecommendation: string;
  immediateActions: string[];
}

export interface InvestigationTimelineSpan {
  id: string;
  entityName: string;
  entityType: "Patient" | "Staff" | "Location";
  location: string;
  start: string;
  end: string;
  category: "ICU" | "Ward" | "Bed" | "Procedure" | "Shift" | "Isolation" | "Transfer";
  description?: string;
  overlapWithIndex?: boolean;
}

export interface InvestigationReport {
  patientId: number;
  patientName: string;
  mrn: string;
  organism: string;
  resistance: ResistanceProfile;
  admissionDate: string;
  status: string;
  confidence: number;
  investigationCompletedAt: string;
  clusterFinding: PotentialClusterFinding;
  evidence: InvestigationEvidenceItem[];
  rankedContacts: RankedContact[];
  timelineSpans: InvestigationTimelineSpan[];
  graphData: TemporalGraphResponse;
  recommendations: string[];
}

export interface InvestigationState {
  patientId: number | null;
  status: "idle" | "investigating" | "completed" | "failed";
  currentAgent: AgentStageName | null;
  agents: Record<AgentStageName, AgentStageState>;
  timeline: InvestigationTimelineSpan[];
  graph: TemporalGraphResponse | null;
  evidence: InvestigationEvidenceItem[];
  contacts: RankedContact[];
  report: InvestigationReport | null;
  error: string | null;
  isMock: boolean;
}
