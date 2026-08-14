import { PriorityLevel, PatientStatus, ResistanceProfile } from "../types/patient";

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return isoString;
  }
}

export function getStatusBadgeVariant(status: PatientStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case "Potential Cluster":
      return {
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
        dot: "bg-rose-500",
      };
    case "Positive":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        dot: "bg-amber-500",
      };
    case "Under Investigation":
      return {
        bg: "bg-sky-50",
        text: "text-sky-700",
        border: "border-sky-200",
        dot: "bg-sky-500",
      };
    case "Resolved":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        dot: "bg-emerald-500",
      };
    default:
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
        dot: "bg-slate-400",
      };
  }
}

export function getRiskBadgeVariant(risk?: PriorityLevel): {
  bg: string;
  text: string;
  border: string;
  iconColor: string;
  label: string;
} {
  switch (risk) {
    case "High":
      return {
        bg: "bg-rose-50",
        text: "text-rose-700 font-semibold",
        border: "border-rose-200",
        iconColor: "text-rose-600",
        label: "High Risk",
      };
    case "Medium":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700 font-medium",
        border: "border-amber-200",
        iconColor: "text-amber-600",
        label: "Medium Risk",
      };
    case "Low":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700 font-normal",
        border: "border-emerald-200",
        iconColor: "text-emerald-600",
        label: "Low Risk",
      };
    default:
      return {
        bg: "bg-slate-100",
        text: "text-slate-600",
        border: "border-slate-200",
        iconColor: "text-slate-500",
        label: "Unknown",
      };
  }
}

export function getResistanceBadgeVariant(resistance?: ResistanceProfile | string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (resistance) {
    case "MDR":
    case "XDR":
    case "PDR":
      return {
        bg: "bg-rose-100",
        text: "text-rose-800 font-semibold",
        border: "border-rose-300",
      };
    case "susceptible":
      return {
        bg: "bg-emerald-100",
        text: "text-emerald-800",
        border: "border-emerald-300",
      };
    default:
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-300",
      };
  }
}
