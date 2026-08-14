/**
 * RogRakshak Detection / Investigation API Types.
 *
 * These types mirror the backend Pydantic schemas in:
 *   backend/app/schemas/detection.py
 *
 * Do NOT modify these types without verifying the backend contract.
 */

// --- Enum-like discriminated unions ---

export type InvestigationStatus =
  | "NO_SIGNAL"
  | "POTENTIAL_CONTACT"
  | "SUSPECTED_CLUSTER"
  | "HIGH_PRIORITY_INVESTIGATION";

export type EvidenceType =
  | "temporal_staff_overlap"
  | "patient_colocation"
  | "shared_procedure_staff"
  | "same_organism"
  | "same_resistance_profile"
  | "temporal_lab_proximity"
  | "shared_location"
  | "clinical_timeline_relation";

export type PatientRole = "index" | "candidate" | "control";

export type ChainNodeType = "patient" | "staff" | "ward" | "procedure";

export type MediatorType = "staff" | "location" | "procedure";

// --- Evidence ---

export interface EvidenceMediator {
  type: MediatorType;
  id: number;
  name: string;
  role?: string | null;
}

export interface EvidenceItem {
  evidence_id: string;
  type: EvidenceType;
  subject_patient_id: number;
  object_patient_id: number;
  mediator?: EvidenceMediator | null;
  location?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  overlap_minutes?: number | null;
  source: string;
  event_id?: string | null;
  source_record_ids: Record<string, unknown>;
  strength: number;
  explanation: string;
}

// --- Scoring ---

export interface ScoringDimension {
  dimension: string;
  raw_score: number;
  weight: number;
  weighted_score: number;
  evidence_count: number;
  description: string;
}

export interface ScoringBreakdown {
  total_score: number;
  normalized_confidence: number;
  dimensions: ScoringDimension[];
}

// --- Transmission Chains ---

export interface TransmissionChainNode {
  type: ChainNodeType;
  id: number;
  name: string;
  role?: string | null;
}

export interface TransmissionChainHop {
  from_id: number;
  via_id?: number | null;
  to_id: number;
  overlap_minutes?: number | null;
  location: string;
  start_time: string;
  end_time: string;
  evidence_id: string;
}

export interface TransmissionChain {
  chain_id: string;
  nodes: TransmissionChainNode[];
  hops: TransmissionChainHop[];
  total_overlap_minutes: number;
  confidence: number;
  description: string;
}

// --- Patient ---

export interface PatientSummary {
  id: number;
  name: string;
  mrn: string;
  role: PatientRole;
  admission_date: string;
  discharge_date?: string | null;
  admitting_diagnosis?: string | null;
  positive_culture_date?: string | null;
}

// --- Timeline ---

export interface InvestigationTimelineEntry {
  timestamp: string;
  event_type: string;
  patient_id: number;
  patient_name: string;
  description: string;
  location?: string | null;
}

// --- Investigation Case ---

export interface InvestigationCase {
  case_id: string;
  status: InvestigationStatus;
  organism: string;
  resistance_profile?: string | null;
  confidence: number;
  scoring: ScoringBreakdown;
  index_patient: PatientSummary;
  patients: PatientSummary[];
  candidate_patients: PatientSummary[];
  evidence: EvidenceItem[];
  transmission_chains: TransmissionChain[];
  timeline: InvestigationTimelineEntry[];
  summary: string;
  warnings: string[];
  generated_at: string;
}

// --- API Responses ---

export interface InvestigationListResponse {
  total_cases: number;
  cases: InvestigationCase[];
}

// --- API Requests ---

export interface CreateInvestigationRequest {
  target_patient_id: number;
  organism: string;
  resistance_profile?: string | null;
  use_mock_graph: boolean;
}

// --- Health Check ---

export interface HealthResponse {
  status: string;
  service: string;
}
