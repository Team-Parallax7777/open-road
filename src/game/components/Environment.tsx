// Static world dressing: terrain mesh, road ribbon, river, bridge,
// forest instances, village huts, farmland plots, campsite props,
// and a simple lake/waterfall.
//
// Heavy use of instanced meshes for trees/bushes/rocks to keep draw
// calls under control.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  buildRoadLoop,
  scatterForest,
  scatterVillage,
  useTerrainGeometry,
  findBridge,
  CAMP_POSITION,
  WORLD_SIZE,
  ROAD_HALF_WIDTH,
  type ScatterItem,
  type Hut,
} from "../world/terrain";

// --- Tree instancing -----------------------------------------------------
function Trees({ items }: { items: ScatterItem[] }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const foliageRef = useRef<THREE.InstancedMesh>(null);

  const split = useMemo(() => {
    const pines = items.filter((i) => i.kind === "pine");
    const broad = items.filter((i) => i.kind === "broadleaf");
    const bush = items.filter((i) => i.kind === "bush");
    const rock = items.filter((i) => i.kind === "rock");
    return { pines, broad, bush, rock };
  }, [items]);

  // Build instance matrices per kind.
  const setMatrices = (ref: React.RefObject<THREE.InstancedMesh | null>, arr: ScatterItem[], yOffset: number) => {
    if (!ref.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    arr.forEach((it, i) => {
      if (i >= ref.current!.count) return;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.rotation);
      s.set(it.scale, it.scale, it.scale);
      p.set(it.x, it.y + yOffset * it.scale, it.z);
      m.compose(p, q, s);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  };

  // Build instance matrices per kind — in useEffect so we don't touch
  // refs during render.
  useEffect(() => {
    setMatrices(trunkRef, [...split.pines, ...split.broad], 0);
    setMatrices(foliageRef, [...split.pines, ...split.broad], 1.2);
  }, [split]);

  // Bush + rock combined into a single instanced mesh group.
  const bushRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    setMatrices(bushRef, split.bush, 0.3);
    setMatrices(rockRef, split.rock, 0.1);
  }, [split]);

  const totalTrees = split.pines.length + split.broad.length;

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, totalTrees]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.18, 0.28, 1.6, 6]} />
        <meshStandardMaterial color="#4a3a26" roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={foliageRef}
        args={[undefined, undefined, totalTrees]}
        castShadow
      >
        <coneGeometry args={[1.5, 4.5, 8]} />
        <meshStandardMaterial color="#3a5a2c" roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={bushRef}
        args={[undefined, undefined, split.bush.length]}
        castShadow
      >
        <sphereGeometry args={[0.8, 8, 6]} />
        <meshStandardMaterial color="#4f6a3a" roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={rockRef}
        args={[undefined, undefined, split.rock.length]}
        castShadow
        receiveShadow
      >
        <dodecahedronGeometry args={[1.0, 0]} />
        <meshStandardMaterial color="#7a7a7a" roughness={1} />
      </instancedMesh>
    </group>
  );
}

// --- Village huts --------------------------------------------------------
function Village({ huts }: { huts: Hut[] }) {
  return (
    <group>
      {huts.map((h, i) => (
        <group key={i} position={[h.x, h.y, h.z]} rotation={[0, h.rot, 0]} scale={h.scale}>
          {/* Walls */}
          <mesh castShadow receiveShadow position={[0, 1.2, 0]}>
            <boxGeometry args={[4, 2.4, 3.2]} />
            <meshStandardMaterial color={h.wallColor} roughness={1} />
          </mesh>
          {/* Thatched roof */}
          <mesh castShadow position={[0, 3.0, 0]}>
            <coneGeometry args={[3.4, 1.8, 4]} />
            <meshStandardMaterial color={h.roofColor} roughness={1} />
          </mesh>
          {/* Door */}
          <mesh position={[0, 0.9, 1.61]}>
            <planeGeometry args={[0.9, 1.8]} />
            <meshStandardMaterial color="#3a2a1a" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- Road ribbon ---------------------------------------------------------
function RoadMesh({ road }: { road: ReturnType<typeof buildRoadLoop> }) {
  const geom = useMemo(() => {
    // Build a flat ribbon following the road loop.
    const positions: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];
    const inner = new THREE.Color("#3a3a3e");
    const outer = new THREE.Color("#2e2e32");

    for (let i = 0; i < road.length; i++) {
      const p = road[i];
      const ix = p.x - p.nx * ROAD_HALF_WIDTH;
      const iz = p.z - p.nz * ROAD_HALF_WIDTH;
      const ox = p.x + p.nx * ROAD_HALF_WIDTH;
      const oz = p.z + p.nz * ROAD_HALF_WIDTH;
      positions.push(ix, 0.05, iz);
      positions.push(ox, 0.05, oz);
      colors.push(inner.r, inner.g, inner.b);
      colors.push(outer.r, outer.g, outer.b);
    }
    for (let i = 0; i < road.length; i++) {
      const a = i * 2;
      const b = ((i + 1) % road.length) * 2;
      indices.push(a, a + 1, b);
      indices.push(a + 1, b + 1, b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [road]);

  return (
    <mesh geometry={geom} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>
  );
}

// --- River + lake + waterfall -------------------------------------------
function Water({ road }: { road: ReturnType<typeof buildRoadLoop> }) {
  const river = useMemo(() => {
    // A long thin plane along x=0.
    const g = new THREE.PlaneGeometry(20, WORLD_SIZE * 2);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const lake = useMemo(() => {
    const g = new THREE.PlaneGeometry(80, 60);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (matRef.current) {
      // Subtle ripple via emissive shimmer.
      const t = clock.elapsedTime;
      matRef.current.emissiveIntensity = 0.06 + Math.sin(t * 0.6) * 0.02;
    }
  });

  return (
    <group>
      {/* River */}
      <mesh geometry={river} position={[0, -0.6, 0]} receiveShadow>
        <meshStandardMaterial
          ref={matRef}
          color="#2a4a5a"
          roughness={0.2}
          metalness={0.1}
          transparent
          opacity={0.85}
          emissive="#1a3a4a"
          emissiveIntensity={0.06}
        />
      </mesh>
      {/* Lake */}
      <mesh geometry={lake} position={[-90, -0.4, 140]} receiveShadow>
        <meshStandardMaterial
          color="#2a4a5a"
          roughness={0.2}
          metalness={0.1}
          transparent
          opacity={0.85}
          emissive="#1a3a4a"
          emissiveIntensity={0.06}
        />
      </mesh>
      {/* Waterfall: a thin tall plane feeding the lake */}
      <mesh position={[-90, 4, 95]}>
        <planeGeometry args={[6, 12]} />
        <meshStandardMaterial
          color="#cfe5f0"
          transparent
          opacity={0.7}
          roughness={0.1}
          emissive="#a0c4d0"
          emissiveIntensity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Cliff behind waterfall */}
      <mesh position={[-90, 4, 88]} receiveShadow>
        <boxGeometry args={[14, 12, 2]} />
        <meshStandardMaterial color="#5a4a3a" roughness={1} />
      </mesh>
    </group>
  );
}

// --- Bridge -------------------------------------------------------------
function Bridge({ road }: { road: ReturnType<typeof buildRoadLoop> }) {
  const bridge = useMemo(() => findBridge(road), [road]);
  return (
    <group position={[bridge.x, 0, 0]}>
      {/* Deck */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[ROAD_HALF_WIDTH * 2 + 2, 0.4, 40]} />
        <meshStandardMaterial color="#6b5a3a" roughness={1} />
      </mesh>
      {/* Railings */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 1.0, s * (ROAD_HALF_WIDTH + 1)]}>
          <mesh>
            <boxGeometry args={[40, 0.1, 0.1]} />
            <meshStandardMaterial color="#3a2a1a" roughness={1} />
          </mesh>
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={i} position={[-19 + i * 4.75, -0.4, 0]}>
              <boxGeometry args={[0.1, 0.8, 0.1]} />
              <meshStandardMaterial color="#3a2a1a" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Support piers */}
      {[-12, 0, 12].map((z) => (
        <mesh key={z} position={[0, -2, z]}>
          <boxGeometry args={[2, 4, 2]} />
          <meshStandardMaterial color="#4a3a2a" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

// --- Campsite -----------------------------------------------------------
function Campsite() {
  const [cx, , cz] = CAMP_POSITION;
  return (
    <group position={[cx, 0, cz]}>
      {/* Fire pit */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[1.0, 1.2, 0.2, 12]} />
        <meshStandardMaterial color="#2a2420" roughness={1} />
      </mesh>
      {/* Stones around fire */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.2, 0.1, Math.sin(a) * 1.2]}>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial color="#6a6a6a" roughness={1} />
          </mesh>
        );
      })}
      {/* Tent */}
      <group position={[4, 0, 2]} rotation={[0, -0.4, 0]}>
        <mesh castShadow position={[0, 1.0, 0]}>
          <coneGeometry args={[1.6, 2.0, 4]} />
          <meshStandardMaterial color="#8a7a5a" roughness={1} />
        </mesh>
      </group>
      {/* Log seats */}
      {[-2.5, -1.5].map((x, i) => (
        <mesh key={i} position={[x, 0.25, -1.5]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 1.2, 8]} />
          <meshStandardMaterial color="#4a3a26" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

// --- Farmland plots -----------------------------------------------------
function Farmland({ road }: { road: ReturnType<typeof buildRoadLoop> }) {
  const plots = useMemo(() => {
    const arr: { x: number; z: number; rot: number; color: string }[] = [];
    const palette = ["#7a8a3a", "#8a9a4a", "#9aaa5a", "#6a7a2a"];
    for (let i = 0; i < 18; i++) {
      const x = -200 + (i % 6) * 30;
      const z = 80 + Math.floor(i / 6) * 30;
      arr.push({
        x,
        z,
        rot: ((i * 7) % 4) * 0.2,
        color: palette[i % palette.length],
      });
    }
    return arr;
  }, []);
  void road;
  return (
    <group>
      {plots.map((p, i) => (
        <mesh key={i} position={[p.x, 0.05, p.z]} rotation={[0, p.rot, 0]} receiveShadow>
          <boxGeometry args={[24, 0.1, 24]} />
          <meshStandardMaterial color={p.color} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

// --- Public Environment component ---------------------------------------
export function Environment() {
  const road = useMemo(() => buildRoadLoop(), []);
  const trees = useMemo(() => scatterForest(road), [road]);
  const huts = useMemo(() => scatterVillage(road), [road]);
  const terrain = useTerrainGeometry(road);

  return (
    <group>
      {/* Terrain */}
      <mesh geometry={terrain} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>

      <RoadMesh road={road} />
      <Water road={road} />
      <Bridge road={road} />
      <Farmland road={road} />
      <Trees items={trees} />
      <Village huts={huts} />
      <Campsite />

      {/* World boundary: a soft ring of taller trees to suggest forest
          extending beyond the playable area. */}
      {Array.from({ length: 60 }).map((_, i) => {
        const a = (i / 60) * Math.PI * 2;
        const r = WORLD_SIZE - 8;
        return (
          <group key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            <mesh position={[0, 3, 0]} castShadow>
              <cylinderGeometry args={[0.3, 0.5, 6, 6]} />
              <meshStandardMaterial color="#3a2a1a" roughness={1} />
            </mesh>
            <mesh position={[0, 9, 0]} castShadow>
              <coneGeometry args={[2.5, 8, 7]} />
              <meshStandardMaterial color="#2c4a22" roughness={1} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
