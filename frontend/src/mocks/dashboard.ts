import { DashboardSummary } from "../types/api";

export const mockDashboardSummary: DashboardSummary = {
  activeCasesCount: 16,
  potentialClustersCount: 1,
  highPriorityContactsCount: 7,
  flaggedLocationsCount: 2,
  topOrganism: "Klebsiella pneumoniae (MDR)",
  lastUpdated: "2026-08-14T19:30:00Z",
  flaggedLocationsList: [
    {
      name: "Intensive Care Unit (ICU)",
      casesCount: 3,
      risk: "High",
    },
    {
      name: "General Medicine A",
      casesCount: 4,
      risk: "High",
    },
    {
      name: "Surgical Ward",
      casesCount: 2,
      risk: "Medium",
    },
  ],
  recentAlerts: [
    {
      id: "alt-01",
      timestamp: "2026-08-11T02:15:00",
      message: "3 downstream patients in General Medicine A share identical MDR AST profile with Index Case 1.",
      type: "critical",
    },
    {
      id: "alt-02",
      timestamp: "2026-08-09T22:30:00",
      message: "Nurse Anita Sharma shift crossover detected between ICU (Aug 3) and Gen Med A (Aug 5-7).",
      type: "warning",
    },
    {
      id: "alt-03",
      timestamp: "2026-08-05T19:15:00",
      message: "Index Case 1 confirmed MDR Klebsiella pneumoniae from Endotracheal Aspirate.",
      type: "info",
    },
  ],
};
