"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
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

/**
 * The hero's WebGL scene. Loaded with next/dynamic (ssr: false) and only when
 * WebGL exists and motion is allowed — see network-figure.tsx, which owns the
 * fallback, the visibility pause and the fade-in.
 *
 * Deliberately plain: flat-ish Lambert spheres, 1px-class lines, no
 * post-processing. The only motion is a slow turn, a little pointer parallax
 * and a pulse per hop. The pulse runs index → nurse first, then nurse → each
 * downstream case, so it reads in the order transmission is hypothesised.
 */

const ROTATION_SPEED = 0.07; // rad/s — one turn every ~90s
const PULSE_PERIOD = 3.6; // seconds for index → staff → downstream
const PARALLAX = { x: 0.1, y: 0.18 };

/** Normalised pointer position (-1..1), written by the figure from window events. */
export type PointerRef = React.MutableRefObject<{ x: number; y: number }>;

function Network({ pointer }: { pointer: PointerRef }) {
  const group = useRef<THREE.Group>(null);
  const pulses = useRef<(THREE.Mesh | null)[]>([]);
  const spin = useRef(REST_ROTATION_Y);

  const edges = useMemo(
    () =>
      EDGES.map(([a, b]) => ({
        from: new THREE.Vector3(...NODE_BY_ID.get(a)!.position),
        to: new THREE.Vector3(...NODE_BY_ID.get(b)!.position),
        // First hop runs in the first half of the cycle, the fan-out in the second
        stage: a === "index" ? 0 : 1,
      })),
    []
  );

  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05); // no jump after a paused tab resumes
    spin.current += dt * ROTATION_SPEED;

    // Ease toward the pointer so parallax never snaps
    const targetX = pointer.current.y * PARALLAX.x;
    const targetY = spin.current + pointer.current.x * PARALLAX.y;
    g.rotation.x += (targetX - g.rotation.x) * Math.min(1, dt * 3);
    g.rotation.y += (targetY - g.rotation.y) * Math.min(1, dt * 3);

    const cycle = (state.clock.elapsedTime % PULSE_PERIOD) / PULSE_PERIOD;
    edges.forEach((e, i) => {
      const m = pulses.current[i];
      if (!m) return;
      const local = cycle * 2 - e.stage; // 0..1 while this hop is live
      const live = local >= 0 && local <= 1;
      m.visible = live;
      if (!live) return;
      const t = local * local * (3 - 2 * local); // ease in-out
      tmp.lerpVectors(e.from, e.to, t);
      m.position.copy(tmp);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * local);
    });
  });

  return (
    <group ref={group} rotation={[0, REST_ROTATION_Y, 0]}>
      {/* Hops */}
      {edges.map((e, i) => (
        <Line
          key={i}
          points={[e.from, e.to]}
          color="#1b2333"
          lineWidth={1.1}
          transparent
          opacity={0.4}
        />
      ))}

      {/* The organism, moving along each hop */}
      {edges.map((_, i) => (
        <mesh
          key={`pulse-${i}`}
          ref={(m) => {
            pulses.current[i] = m;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshBasicMaterial color={ROLE_COLOR.index} transparent opacity={0} />
        </mesh>
      ))}

      {/* People in the chain */}
      {CHAIN_NODES.map((n) => (
        <mesh key={n.id} position={n.position}>
          <sphereGeometry args={[n.radius, 32, 32]} />
          <meshLambertMaterial color={ROLE_COLOR[n.role]} />
        </mesh>
      ))}

      {/* Everyone else on record — one draw call */}
      <OtherPatients />
    </group>
  );
}

function OtherPatients() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const setup = useMemo(() => new THREE.Object3D(), []);

  return (
    <instancedMesh
      ref={(mesh) => {
        (ref as React.MutableRefObject<THREE.InstancedMesh | null>).current = mesh;
        if (!mesh) return;
        OTHER_NODES.forEach((n, i) => {
          setup.position.set(...n.position);
          setup.updateMatrix();
          mesh.setMatrixAt(i, setup.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }}
      args={[undefined, undefined, OTHER_NODES.length]}
    >
      <sphereGeometry args={[OTHER_NODES[0].radius, 12, 12]} />
      <meshBasicMaterial color={ROLE_COLOR.other} />
    </instancedMesh>
  );
}

export default function NetworkCanvas({
  active,
  pointer,
  onReady,
}: {
  /** False pauses the render loop entirely (off-screen or tab hidden). */
  active: boolean;
  pointer: PointerRef;
  onReady: () => void;
}) {
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
      aria-hidden
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 4, 6]} intensity={1.4} />
      <Network pointer={pointer} />
    </Canvas>
  );
}
