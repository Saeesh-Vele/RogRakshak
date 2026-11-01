"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Html, Line } from "@react-three/drei";
import * as THREE from "three";

import {
  CAMERA_FOV,
  CAMERA_Z,
  CHAIN_NODES,
  EDGES,
  NODE_BY_ID,
  OTHER_NODES,
  REST_ROTATION_Y,
  ROLE_COLOR,
} from "@/components/landing/network-data";
import type { CaseFacts, FactNodeId } from "@/components/landing/case-facts";
import { describeNode, highlight, type NetworkView } from "@/components/landing/network-view";

/**
 * The hero's WebGL scene. Loaded with next/dynamic (ssr: false) and only when
 * WebGL exists and motion is allowed — see network-figure.tsx, which owns the
 * fallback, the visibility pause, the controls and the fade-in.
 *
 * Deliberately plain: Lambert spheres, thin lines, no post-processing. Motion:
 * a slow turn, a little pointer parallax, a pulse per hop, and the unlinked
 * patients easing away from the pointer. Interaction: hover a person for a
 * label card; click (or tap) to light their hops and dim the rest.
 */

const ROTATION_SPEED = 0.07; // rad/s — one turn every ~90s
const PULSE_PERIOD = 3.6; // seconds for index → staff → downstream
const PARALLAX = { x: 0.1, y: 0.18 };
const DRIFT_RADIUS = 0.28; // in NDC
const DRIFT_DISTANCE = 0.35; // world units at full strength

/** Normalised pointer position (-1..1), written by the figure from window events. */
export type PointerRef = React.MutableRefObject<{ x: number; y: number }>;

interface SceneProps {
  pointer: PointerRef;
  facts: CaseFacts;
  view: NetworkView;
  hovered: FactNodeId | null;
  onHover: (id: FactNodeId | null) => void;
  onSelect: (id: FactNodeId | null) => void;
}

/** Ease a material's opacity toward a target each frame. */
function easeOpacity(m: THREE.Material | THREE.Material[] | undefined, target: number, k: number) {
  if (!m || Array.isArray(m)) return;
  m.opacity += (target - m.opacity) * k;
  m.visible = m.opacity > 0.01;
}

function Network({ pointer, facts, view, hovered, onHover, onSelect }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const pulses = useRef<(THREE.Mesh | null)[]>([]);
  const nodeMeshes = useRef<Record<string, THREE.Mesh | null>>({});
  const spin = useRef(REST_ROTATION_Y);
  const lit = useMemo(() => highlight(facts, view.selected), [facts, view.selected]);

  const edges = useMemo(
    () =>
      EDGES.map(([a, b]) => ({
        key: `${a}-${b}`,
        from: new THREE.Vector3(...NODE_BY_ID.get(a)!.position),
        to: new THREE.Vector3(...NODE_BY_ID.get(b)!.position),
        stage: a === "index" ? 0 : 1,
      })),
    []
  );
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const nodeTarget = (id: string) => {
    if (!view.nodeVisible[id]) return 0;
    if (lit && !lit.nodes.has(id)) return 0.16;
    return 1;
  };

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05); // no jump after a paused tab resumes
    spin.current += dt * ROTATION_SPEED;

    const targetX = pointer.current.y * PARALLAX.x;
    const targetY = spin.current + pointer.current.x * PARALLAX.y;
    g.rotation.x += (targetX - g.rotation.x) * Math.min(1, dt * 3);
    g.rotation.y += (targetY - g.rotation.y) * Math.min(1, dt * 3);

    const k = Math.min(1, dt * 8);
    for (const n of CHAIN_NODES) {
      const m = nodeMeshes.current[n.id];
      if (!m) continue;
      easeOpacity(m.material as THREE.Material, nodeTarget(n.id), k);
      const s = view.nodeVisible[n.id] ? 1 : 0.4;
      m.scale.setScalar(m.scale.x + (s - m.scale.x) * k);
    }

    // Pulses only describe the whole case, so they rest while scrubbing
    const cycle = (state.clock.elapsedTime % PULSE_PERIOD) / PULSE_PERIOD;
    edges.forEach((e, i) => {
      const p = pulses.current[i];
      if (!p) return;
      const local = cycle * 2 - e.stage;
      const live = !view.timeline && local >= 0 && local <= 1 && (!lit || lit.edges.has(e.key));
      p.visible = live;
      if (!live) return;
      const t = local * local * (3 - 2 * local);
      tmp.lerpVectors(e.from, e.to, t);
      p.position.copy(tmp);
      (p.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * local);
    });
  });

  return (
    <group ref={group} rotation={[0, REST_ROTATION_Y, 0]}>
      {/* Hops: drawn as far as the overlap has happened at the scrubbed time */}
      {edges.map((e) => {
        const progress = view.edgeProgress[e.key] ?? 1;
        if (progress <= 0) return null;
        const end = progress >= 1 ? e.to : e.from.clone().lerp(e.to, progress);
        const isLit = lit?.edges.has(e.key);
        return (
          <Line
            key={e.key}
            points={[e.from, end]}
            color={isLit ? "#1f497a" : "#1b2333"}
            lineWidth={isLit ? 2.2 : 1.1}
            transparent
            opacity={lit ? (isLit ? 0.9 : 0.08) : 0.4}
          />
        );
      })}

      {/* The organism, moving along each hop */}
      {edges.map((_, i) => (
        <mesh key={`pulse-${i}`} ref={(m) => { pulses.current[i] = m; }} visible={false}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshBasicMaterial color={ROLE_COLOR.index} transparent opacity={0} />
        </mesh>
      ))}

      {/* People in the chain */}
      {CHAIN_NODES.map((n) => {
        const id = n.id as FactNodeId;
        return (
          <group key={n.id} position={n.position}>
            <mesh ref={(m) => { nodeMeshes.current[n.id] = m; }}>
              <sphereGeometry args={[n.radius, 32, 32]} />
              <meshLambertMaterial color={ROLE_COLOR[n.role]} transparent opacity={1} />
            </mesh>
            {/* Culture positive — the only red ring, shown while replaying the case */}
            {view.timeline && view.cultured[id] && view.nodeVisible[id] && (
              <Billboard>
                <mesh>
                  <ringGeometry args={[n.radius * 1.45, n.radius * 1.6, 48]} />
                  <meshBasicMaterial color={ROLE_COLOR.index} transparent opacity={lit && !lit.nodes.has(id) ? 0.15 : 0.9} />
                </mesh>
              </Billboard>
            )}
            {/* A larger invisible target, so a 0.14-unit sphere is easy to hover and tap */}
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                if (!view.nodeVisible[id]) return;
                onHover(id);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                onHover(null);
                document.body.style.cursor = "";
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!view.nodeVisible[id]) return;
                onSelect(view.selected === id ? null : id);
              }}
            >
              <sphereGeometry args={[n.radius * 2.2, 12, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {hovered === id && <HoverCard facts={facts} id={id} />}
          </group>
        );
      })}

      <OtherPatients view={view} dimmed={Boolean(lit)} />
    </group>
  );
}

function HoverCard({ facts, id }: { facts: CaseFacts; id: FactNodeId }) {
  const d = describeNode(facts, id);
  return (
    // Anchored by its bottom edge just above the node, so it never covers what it describes
    <Html position={[0, 0.2, 0]} zIndexRange={[20, 10]} style={{ pointerEvents: "none" }}>
      <div className="w-max max-w-[16rem] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-md border border-border bg-card/95 px-3 py-2 shadow-pop">
        <p className="text-ui font-medium text-foreground">{d.name}</p>
        <p className="label-caps mt-0.5">{d.role}</p>
        {d.lines.map((l) => (
          <p key={l} className="mt-1 text-meta text-muted-foreground">{l}</p>
        ))}
      </div>
    </Html>
  );
}

/**
 * The 36 unlinked patients: one instanced draw call. They fade with the
 * toggle, dim when someone is selected, and ease away from the pointer.
 */
function OtherPatients({ view, dimmed }: { view: NetworkView; dimmed: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const inside = useRef(false);
  const { gl, camera } = useThree();
  const tmp = useMemo(
    () => ({
      obj: new THREE.Object3D(),
      world: new THREE.Vector3(),
      ndc: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      push: new THREE.Vector3(),
      inv: new THREE.Quaternion(),
    }),
    []
  );
  const offsets = useMemo(() => OTHER_NODES.map(() => new THREE.Vector3()), []);
  const bases = useMemo(() => OTHER_NODES.map((n) => new THREE.Vector3(...n.position)), []);

  // Drift only while the pointer is actually over the canvas
  useEffect(() => {
    const el = gl.domElement;
    const on = () => (inside.current = true);
    const off = () => (inside.current = false);
    el.addEventListener("pointerenter", on);
    el.addEventListener("pointerleave", off);
    return () => {
      el.removeEventListener("pointerenter", on);
      el.removeEventListener("pointerleave", off);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const k = Math.min(1, Math.min(delta, 0.05) * 6);
    easeOpacity(mesh.material as THREE.Material, view.showUnlinked ? (dimmed ? 0.25 : 1) : 0, k);
    if (!(mesh.material as THREE.Material).visible) return;

    const parent = mesh.parent!;
    parent.updateMatrixWorld();
    tmp.right.setFromMatrixColumn(camera.matrixWorld, 0);
    tmp.up.setFromMatrixColumn(camera.matrixWorld, 1);
    parent.getWorldQuaternion(tmp.inv).invert();

    for (let i = 0; i < bases.length; i++) {
      tmp.push.set(0, 0, 0);
      if (inside.current) {
        tmp.world.copy(bases[i]).add(offsets[i]).applyMatrix4(parent.matrixWorld);
        tmp.ndc.copy(tmp.world).project(camera);
        const dx = tmp.ndc.x - state.pointer.x;
        const dy = tmp.ndc.y - state.pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < DRIFT_RADIUS && dist > 1e-4) {
          const strength = (1 - dist / DRIFT_RADIUS) * DRIFT_DISTANCE;
          tmp.push
            .copy(tmp.right)
            .multiplyScalar((dx / dist) * strength)
            .addScaledVector(tmp.up, (dy / dist) * strength)
            .applyQuaternion(tmp.inv);
        }
      }
      offsets[i].lerp(tmp.push, k * 0.6);
      tmp.obj.position.copy(bases[i]).add(offsets[i]);
      tmp.obj.updateMatrix();
      mesh.setMatrixAt(i, tmp.obj.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={(mesh) => {
        (ref as React.MutableRefObject<THREE.InstancedMesh | null>).current = mesh;
        if (!mesh) return;
        bases.forEach((b, i) => {
          tmp.obj.position.copy(b);
          tmp.obj.updateMatrix();
          mesh.setMatrixAt(i, tmp.obj.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }}
      args={[undefined, undefined, OTHER_NODES.length]}
    >
      <sphereGeometry args={[OTHER_NODES[0].radius, 12, 12]} />
      <meshBasicMaterial color={ROLE_COLOR.other} transparent opacity={1} />
    </instancedMesh>
  );
}

export default function NetworkCanvas({
  active,
  pointer,
  onReady,
  facts,
  view,
  hovered,
  onHover,
  onSelect,
}: {
  /** False pauses the render loop entirely (off-screen or tab hidden). */
  active: boolean;
  onReady: () => void;
} & SceneProps) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        // Wait for a painted frame before revealing, so the fade never shows an empty canvas
        requestAnimationFrame(() => requestAnimationFrame(onReady));
      }}
      onPointerMissed={() => onSelect(null)}
      aria-hidden
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 4, 6]} intensity={1.4} />
      <Network
        pointer={pointer}
        facts={facts}
        view={view}
        hovered={hovered}
        onHover={onHover}
        onSelect={onSelect}
      />
    </Canvas>
  );
}
