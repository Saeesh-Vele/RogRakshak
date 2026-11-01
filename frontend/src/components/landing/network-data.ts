/**
 * The transmission network drawn in the landing hero — CASE-2026-001 exactly
 * as the API returns it:
 *
 *   CHAIN-001  Rajesh Verma (index) → Nurse Anita Sharma → Suresh Joshi
 *   CHAIN-002  Rajesh Verma (index) → Nurse Anita Sharma → Meenakshi Rao
 *   CHAIN-003  Rajesh Verma (index) → Nurse Anita Sharma → Tarun Agarwal
 *
 * every hop a 720-minute shift overlap. The grey points are the other 36
 * patients on record (40 in the synthetic dataset, 4 of them in the chain);
 * they are deliberately unconnected, because no contact links them to it.
 *
 * Positions are hand-placed for legibility; only the topology is data. The
 * same coordinates and the same camera feed both the WebGL scene and the
 * static SVG fallback, so the two always show the same picture.
 */

export type NodeRole = "index" | "staff" | "downstream" | "other";

export interface NetworkNode {
  id: string;
  role: NodeRole;
  label?: string;
  position: [number, number, number];
  radius: number;
}

/** Mirrors --node-infected / --node-location / --node-downstream / --node-neutral. */
export const ROLE_COLOR: Record<NodeRole, string> = {
  index: "hsl(0, 72%, 58%)",
  staff: "hsl(173, 58%, 39%)",
  downstream: "hsl(38, 84%, 55%)",
  other: "hsl(218, 11%, 72%)",
};

export const CHAIN_NODES: NetworkNode[] = [
  { id: "index", role: "index", label: "Rajesh Verma", position: [-2.15, 1.05, 0.35], radius: 0.2 },
  { id: "staff", role: "staff", label: "Nurse Anita Sharma", position: [0.05, 0.05, -0.15], radius: 0.16 },
  { id: "d1", role: "downstream", label: "Suresh Joshi", position: [2.05, 1.2, -0.55], radius: 0.14 },
  { id: "d2", role: "downstream", label: "Meenakshi Rao", position: [1.75, -1.35, 0.7], radius: 0.14 },
  { id: "d3", role: "downstream", label: "Tarun Agarwal", position: [-0.55, -1.75, -0.75], radius: 0.14 },
];

/** Directed hops, in transmission order. */
export const EDGES: [string, string][] = [
  ["index", "staff"],
  ["staff", "d1"],
  ["staff", "d2"],
  ["staff", "d3"],
];

/** Small deterministic PRNG so the background points never move between loads. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const OTHER_PATIENT_COUNT = 36;

export const OTHER_NODES: NetworkNode[] = (() => {
  const rand = mulberry32(2026);
  const out: NetworkNode[] = [];
  for (let i = 0; i < OTHER_PATIENT_COUNT; i++) {
    // Even spread over a shell around the chain (Fibonacci sphere + jitter)
    const y = 1 - (2 * (i + 0.5)) / OTHER_PATIENT_COUNT;
    const r = Math.sqrt(1 - y * y);
    const phi = i * Math.PI * (3 - Math.sqrt(5)) + rand() * 0.5;
    const dist = 2.7 + rand() * 0.9;
    out.push({
      id: `p${i}`,
      role: "other",
      position: [Math.cos(phi) * r * dist * 1.25, y * dist * 0.82, Math.sin(phi) * r * dist],
      radius: 0.045,
    });
  }
  return out;
})();

export const ALL_NODES = [...CHAIN_NODES, ...OTHER_NODES];
export const NODE_BY_ID = new Map(ALL_NODES.map((n) => [n.id, n]));

// --- Camera, shared by the scene and the fallback projection ---------------

export const CAMERA_Z = 9;
export const CAMERA_FOV = 38; // vertical, degrees
/** Resting pose: rotation about Y when the scene is still. */
export const REST_ROTATION_Y = 0.35;
/** The figure's aspect ratio (width / height); the container enforces it. */
export const FIGURE_ASPECT = 5 / 4;

/**
 * Projects a world point to SVG coordinates in a `0 0 1000 800` viewBox,
 * using the same perspective camera as the WebGL scene at its resting pose.
 * Returns the depth scale too, so nearer nodes draw larger.
 */
export function project([x, y, z]: [number, number, number]) {
  const c = Math.cos(REST_ROTATION_Y);
  const s = Math.sin(REST_ROTATION_Y);
  const rx = x * c + z * s;
  const rz = -x * s + z * c;
  const depth = CAMERA_Z - rz;
  const f = 1 / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);
  const ndcX = (f * rx) / depth / FIGURE_ASPECT;
  const ndcY = (f * y) / depth;
  return {
    x: (ndcX + 1) * 500,
    y: (1 - ndcY) * 400,
    // pixels per world unit at this depth, for radii
    scale: (f / depth) * 400,
  };
}
