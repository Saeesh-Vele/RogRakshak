import { create } from "zustand";
import {
  AgentStageName,
  AgentStageState,
  InvestigationEvidenceItem,
  InvestigationReport,
  InvestigationTimelineSpan,
  RankedContact,
} from "../types/investigation";
import { TemporalGraphResponse } from "../types/graph";
import { MockInvestigationStream } from "../mocks/investigation-stream";
import { mockInvestigationReport } from "../mocks/investigation";

const initialAgents: Record<AgentStageName, AgentStageState> = {
  case: {
    name: "case",
    displayName: "Case Agent",
    status: "pending",
  },
  timeline: {
    name: "timeline",
    displayName: "Timeline Agent",
    status: "pending",
  },
  contact: {
    name: "contact",
    displayName: "Contact Agent",
    status: "pending",
  },
  graph: {
    name: "graph",
    displayName: "Graph Agent",
    status: "pending",
  },
  risk: {
    name: "risk",
    displayName: "Risk Agent",
    status: "pending",
  },
  report: {
    name: "report",
    displayName: "Report Agent",
    status: "pending",
  },
};

interface InvestigationStoreState {
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
  selectedEvidenceId: string | null;

  // Actions
  startInvestigation: (patientId: number) => void;
  resetInvestigation: () => void;
  cancelInvestigation: () => void;
  setSelectedEvidenceId: (id: string | null) => void;
}

let activeStream: MockInvestigationStream | null = null;

export const useInvestigationStore = create<InvestigationStoreState>((set) => ({
  patientId: null,
  status: "idle",
  currentAgent: null,
  agents: { ...initialAgents },
  timeline: [],
  graph: null,
  evidence: [],
  contacts: [],
  report: null,
  error: null,
  isMock: true,
  selectedEvidenceId: null,

  setSelectedEvidenceId: (id) => set({ selectedEvidenceId: id }),

  resetInvestigation: () => {
    if (activeStream) {
      activeStream.cancel();
      activeStream = null;
    }
    set({
      patientId: null,
      status: "idle",
      currentAgent: null,
      agents: { ...initialAgents },
      timeline: [],
      graph: null,
      evidence: [],
      contacts: [],
      report: null,
      error: null,
      selectedEvidenceId: null,
    });
  },

  cancelInvestigation: () => {
    if (activeStream) {
      activeStream.cancel();
      activeStream = null;
    }
    set({
      status: "idle",
      currentAgent: null,
    });
  },

  startInvestigation: (patientId: number) => {
    // Reset previous run
    if (activeStream) {
      activeStream.cancel();
      activeStream = null;
    }

    set({
      patientId,
      status: "investigating",
      error: null,
      report: null,
      timeline: [],
      graph: null,
      evidence: [],
      contacts: [],
      agents: Object.keys(initialAgents).reduce((acc, key) => {
        const stage = key as AgentStageName;
        acc[stage] = {
          ...initialAgents[stage],
          status: "pending",
          summary: undefined,
          startedAt: undefined,
          completedAt: undefined,
        };
        return acc;
      }, {} as Record<AgentStageName, AgentStageState>),
    });

    activeStream = new MockInvestigationStream();
    activeStream.start(patientId, {
      onAgentStart: (stage) => {
        set((state) => ({
          currentAgent: stage,
          agents: {
            ...state.agents,
            [stage]: {
              ...state.agents[stage],
              status: "running",
              startedAt: new Date().toISOString(),
            },
          },
        }));
      },
      onAgentComplete: (stage, summary, data) => {
        set((state) => {
          const updatedAgents = {
            ...state.agents,
            [stage]: {
              ...state.agents[stage],
              status: "complete" as const,
              summary,
              completedAt: new Date().toISOString(),
            },
          };

          const nextState: Partial<InvestigationStoreState> = {
            agents: updatedAgents,
          };

          if (stage === "timeline" && Array.isArray(data)) {
            nextState.timeline = data as InvestigationTimelineSpan[];
          } else if (stage === "contact" && Array.isArray(data)) {
            nextState.contacts = data as RankedContact[];
          } else if (stage === "graph" && data && typeof data === "object") {
            nextState.graph = data as TemporalGraphResponse;
          } else if (stage === "risk") {
            nextState.evidence = mockInvestigationReport.evidence;
          } else if (stage === "report" && data) {
            nextState.report = data as InvestigationReport;
            nextState.timeline = (data as InvestigationReport).timelineSpans;
            nextState.graph = (data as InvestigationReport).graphData;
            nextState.evidence = (data as InvestigationReport).evidence;
            nextState.contacts = (data as InvestigationReport).rankedContacts;
          }

          return nextState;
        });
      },
      onComplete: () => {
        set({
          status: "completed",
          currentAgent: null,
          report: mockInvestigationReport,
          timeline: mockInvestigationReport.timelineSpans,
          graph: mockInvestigationReport.graphData,
          evidence: mockInvestigationReport.evidence,
          contacts: mockInvestigationReport.rankedContacts,
        });
      },
      onError: (err) => {
        set({
          status: "failed",
          error: err,
          currentAgent: null,
        });
      },
    });
  },
}));
