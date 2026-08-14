import { PriorityLevel } from "./patient";

export type NodeType = "Patient" | "Staff" | "Ward" | "Bed" | "Procedure" | "Device";

export interface GraphNodeData extends Record<string, unknown> {
  label: string;
  sublabel?: string;
  type: NodeType;
  mrn?: string;
  role?: string;
  ward?: string;
  bed?: string;
  organism?: string;
  resistance?: string;
  isIndex?: boolean;
  isVector?: boolean;
  isPositive?: boolean;
  riskLevel?: PriorityLevel;
  details?: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  type?: string;
  label?: string;
  position?: { x: number; y: number };
  data: GraphNodeData;
}

export interface GraphEdgeData extends Record<string, unknown> {
  label?: string;
  relationshipType: string;
  overlapDuration?: string;
  timeWindow?: {
    start: string;
    end: string;
  };
  riskLevel: PriorityLevel;
  sourceRole?: string;
  targetRole?: string;
  evidenceSource?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  riskLevel?: PriorityLevel;
  data?: GraphEdgeData;
  animated?: boolean;
}

export interface TemporalGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
