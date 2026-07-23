// Compact R3F canvas used inside start-menu cards to preview each
// vehicle. Loads the same GLB as the in-game Vehicle so the preview
// matches what the player will actually drive. Spins slowly so the
// silhouette is visible from every angle.

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { VEHICLES, type VehicleId } from "../vehicles";

interface Props {
  vehicleId: VehicleId;
  accentColor: string;
  active: boolean;
}

function CarModel({ vehicleId }: { vehicleId: VehicleId }) {
  const groupRef = useRef<THREE.Group>(null);
  const spec = VEHICLES[vehicleId];
  const { scene } = useGLTF(spec.modelPath);

  // Clone so we don't mutate the cached scene.
  const model = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.4;
  });

  // We want the model to fill the preview nicely. Compute a scale that
  // normalizes the longest dimension to ~2.4 units.
  const previewScale = spec.modelScale * (2.4 / Math.max(spec.length, spec.width));

  return (
    <group ref={groupRef} position={[0, -0.4, 0]}>
      <group
        scale={previewScale}
        rotation={[0, spec.modelRotationY, 0]}
        position={[0, spec.modelOffsetY, 0]}
      >
        <primitive object={model} />
      </group>
    </group>
  );
}

function Fallback() {
  return (
    <mesh>
      <boxGeometry args={[1.5, 0.5, 3]} />
      <meshStandardMaterial color="#444" />
    </mesh>
  );
}

export function VehicleBadge3D({ vehicleId, active }: Props) {
  return (
    <Canvas
      camera={{ fov: 30, position: [3.5, 2, 4] }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[3, 5, 2]}
        intensity={active ? 2.2 : 1.4}
        color="#fff5e0"
      />
      <directionalLight
        position={[-3, 2, -2]}
        intensity={0.6}
        color="#a0c4d0"
      />
      <Suspense fallback={<Fallback />}>
        <CarModel vehicleId={vehicleId} />
      </Suspense>
      {/* Soft ground disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
    </Canvas>
  );
}
