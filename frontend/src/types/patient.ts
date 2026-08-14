export type ResistanceProfile = "MDR" | "XDR" | "PDR" | "susceptible" | "unknown";

export type PatientStatus = "Positive" | "Under Investigation" | "Potential Cluster" | "Resolved" | "Negative" | "Flagged";

export type PriorityLevel = "High" | "Medium" | "Low";

export interface AntimicrobialSensitivity {
  antibiotic: string;
  result: "Resistant (R)" | "Intermediate (I)" | "Susceptible (S)" | "R" | "I" | "S";
  mic?: string;
  interp?: "R" | "I" | "S";
}

export interface LabReport {
  id: number;
  patientId: number;
  specimenType: string;
  organism: string;
  resistanceProfile: ResistanceProfile;
  collectedAt: string;
  reportedAt: string;
  receivedAt?: string;
  cultureResult?: string;
  antimicrobialSusceptibility?: AntimicrobialSensitivity[];
  documentPath?: string;
}

export interface MovementEvent {
  id: string;
  patientId: number;
  location: string;
  department: string;
  bed?: string;
  eventType: "Admission" | "Ward" | "Bed" | "ICU" | "Procedure" | "Transfer" | "Discharge";
  startTime: string;
  endTime: string;
  details?: string;
}

export interface Patient {
  id: number;
  name: string;
  mrn: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  admissionDate: string;
  dischargeDate?: string | null;
  currentWard: string;
  currentBed?: string;
  status: PatientStatus;
  priority: PriorityLevel;
  primaryDiagnosis?: string;
  latestLab?: {
    organism: string;
    resistance: ResistanceProfile;
    specimen: string;
    reportedAt: string;
    isPositive: boolean;
  };
  labReports?: LabReport[];
  movements?: MovementEvent[];
}
