import { AgentStageName } from "../types/investigation";
import { mockInvestigationReport } from "./investigation";

export interface StreamCallbacks {
  onAgentStart?: (stage: AgentStageName) => void;
  onAgentComplete?: (stage: AgentStageName, summary: string, data?: unknown) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

export class MockInvestigationStream {
  private isCancelled = false;
  private timerIds: NodeJS.Timeout[] = [];

  public start(patientId: number, callbacks: StreamCallbacks): () => void {
    this.isCancelled = false;
    this.timerIds = [];

    const stages: {
      stage: AgentStageName;
      delay: number;
      runningTime: number;
      summary: string;
      getData: () => unknown;
    }[] = [
      {
        stage: "case",
        delay: 300,
        runningTime: 800,
        summary: "Patient record & microbiological profile confirmed",
        getData: () => ({
          patientId,
          patientName: mockInvestigationReport.patientName,
          mrn: mockInvestigationReport.mrn,
          organism: mockInvestigationReport.organism,
          resistance: mockInvestigationReport.resistance,
        }),
      },
      {
        stage: "timeline",
        delay: 300,
        runningTime: 900,
        summary: "14 movement & clinical location events reconstructed",
        getData: () => mockInvestigationReport.timelineSpans,
      },
      {
        stage: "contact",
        delay: 300,
        runningTime: 900,
        summary: "7 temporal contacts & staff crossovers identified",
        getData: () => mockInvestigationReport.rankedContacts,
      },
      {
        stage: "graph",
        delay: 300,
        runningTime: 1000,
        summary: "3 connected positive cases linked via staff vector",
        getData: () => mockInvestigationReport.graphData,
      },
      {
        stage: "risk",
        delay: 300,
        runningTime: 900,
        summary: "Potential cluster detected with 94% confidence",
        getData: () => mockInvestigationReport.clusterFinding,
      },
      {
        stage: "report",
        delay: 300,
        runningTime: 800,
        summary: "Comprehensive investigation report & recommendations compiled",
        getData: () => mockInvestigationReport,
      },
    ];

    let currentAccumulatedDelay = 0;

    stages.forEach((item, index) => {
      // Trigger running state
      const startTimer = setTimeout(() => {
        if (this.isCancelled) return;
        callbacks.onAgentStart?.(item.stage);
      }, currentAccumulatedDelay + item.delay);
      this.timerIds.push(startTimer);

      currentAccumulatedDelay += item.delay + item.runningTime;

      // Trigger completion
      const completeTimer = setTimeout(() => {
        if (this.isCancelled) return;
        callbacks.onAgentComplete?.(item.stage, item.summary, item.getData());

        // If last stage, complete entire investigation
        if (index === stages.length - 1) {
          callbacks.onComplete?.();
        }
      }, currentAccumulatedDelay);
      this.timerIds.push(completeTimer);
    });

    return () => this.cancel();
  }

  public cancel(): void {
    this.isCancelled = true;
    this.timerIds.forEach((id) => clearTimeout(id));
    this.timerIds = [];
  }
}
