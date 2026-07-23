// Player vehicle: arcade-style physics on a height-field terrain.
//
// The vehicle body is loaded from a real GLB model via useGLTF. Each
// model has its own scale/rotation/offset baked in via the VehicleSpec
// so all six cars sit consistently on the road regardless of how the
// artist exported them.
//
// Physics model:
//   - Forward/back acceleration along the vehicle's heading.
//   - Turning scales with speed (no turn at standstill, full turn near
//     mid speed, reduced at very high speed).
//   - Lateral grip keeps the car from sliding sideways. Wet/snowy
//     weather reduces grip so the car feels looser.
//   - Position is constrained to the terrain height; we add a tiny
//     ground-hug suspension wobble for life.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "../store";
import { VEHICLES } from "../vehicles";
import { buildRoadLoop, terrainHeight } from "../world/terrain";
import type { InputState } from "../hooks/useKeyboard";

interface VehicleProps {
  inputRef: React.MutableRefObject<InputState>;
  road: ReturnType<typeof buildRoadLoop>;
}

export function Vehicle({ inputRef, road }: VehicleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const modelGroupRef = useRef<THREE.Group>(null);
  const headlightLRef = useRef<THREE.SpotLight>(null);
  const headlightRRef = useRef<THREE.SpotLight>(null);
  const brakeLightRef = useRef<THREE.MeshStandardMaterial>(null);

  // Mutable physics state (avoid React re-renders).
  const phys = useRef({
    pos: new THREE.Vector3(280, 0, 0), // start on the road
    heading: -Math.PI / 2, // facing along +z travel direction
    speed: 0, // signed, m/s
    slip: 0, // lateral slip 0..1
    bob: 0, // suspension bob
  });

  const vehicleId = useGame((s) => s.vehicleId);
  const spec = VEHICLES[vehicleId];

  // Load the GLB. drei's useGLTF caches automatically so the same model
  // isn't re-fetched when switching vehicles.
  const { scene } = useGLTF(spec.modelPath);

  // Clone the scene so we can safely attach it without mutating the cache.
  const model = useMemo(() => {
    const cloned = scene.clone(true);
    // Enable shadows on every mesh in the model.
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30); // clamp for stability
    const state = useGame.getState();
    const v = VEHICLES[state.vehicleId];
    const input = inputRef.current;
    const ph = phys.current;

    // Reset (X key)
    if (input.reset) {
      ph.pos.set(280, 0, 0);
      ph.heading = -Math.PI / 2;
      ph.speed = 0;
      input.reset = false;
    }

    // --- Acceleration -------------------------------------------------
    let throttle = 0;
    if (input.forward) throttle += 1;
    if (input.backward) throttle -= 1;

    let grip = v.grip;
    // Weather affects grip.
    if (state.weather === "rain") grip *= 0.7;
    if (state.weather === "snow") grip *= 0.55;
    if (state.weather === "fog") grip *= 0.92;

    if (throttle > 0) {
      ph.speed += v.acceleration * throttle * dt;
    } else if (throttle < 0) {
      // Brake first if moving forward, then reverse.
      if (ph.speed > 0.5) {
        ph.speed -= v.braking * dt;
      } else {
        ph.speed -= v.acceleration * 0.7 * dt;
        if (ph.speed < -v.reverseSpeed) ph.speed = -v.reverseSpeed;
      }
    } else {
      // Engine braking / drag.
      ph.speed *= 1 - 0.6 * dt;
      if (Math.abs(ph.speed) < 0.05) ph.speed = 0;
    }

    // Brake / handbrake.
    if (input.brake) {
      ph.speed -= Math.sign(ph.speed) * v.braking * 0.8 * dt;
      if (Math.abs(ph.speed) < 0.2) ph.speed = 0;
    }
    if (input.handbrake) {
      ph.speed *= 1 - 2.5 * dt;
      ph.slip = Math.min(1, ph.slip + 1.5 * dt);
    } else {
      ph.slip *= 1 - 3 * dt;
    }

    // Cruise control: hold target speed when no throttle.
    if (state.cruiseControl && throttle === 0 && !input.brake) {
      const diff = state.cruiseSpeed - ph.speed;
      ph.speed += Math.sign(diff) * Math.min(Math.abs(diff), v.acceleration * 0.4 * dt);
    }

    // Clamp to max speed.
    const maxSpd = v.maxSpeed;
    if (ph.speed > maxSpd) ph.speed = maxSpd;
    if (ph.speed < -v.reverseSpeed) ph.speed = -v.reverseSpeed;

    // --- Steering -----------------------------------------------------
    let steer = 0;
    if (input.left) steer += 1;
    if (input.right) steer -= 1;

    // Steering authority scales with speed.
    const speedFrac = Math.min(1, Math.abs(ph.speed) / 12);
    const steerAuthority =
      v.turnRate *
      speedFrac *
      (1 - Math.min(0.6, Math.abs(ph.speed) / (maxSpd * 1.4)));
    const dir = ph.speed >= 0 ? 1 : -1;
    ph.heading += steer * steerAuthority * dt * dir;
    ph.heading += steer * steerAuthority * dt * dir * ph.slip * 0.8;

    // --- Integrate position ------------------------------------------
    const forwardX = Math.sin(ph.heading);
    const forwardZ = Math.cos(ph.heading);
    ph.pos.x += forwardX * ph.speed * dt;
    ph.pos.z += forwardZ * ph.speed * dt;

    // Keep within world bounds (soft).
    const BOUND = 580;
    if (Math.abs(ph.pos.x) > BOUND) {
      ph.pos.x = Math.sign(ph.pos.x) * BOUND;
      ph.speed *= 0.5;
    }
    if (Math.abs(ph.pos.z) > BOUND) {
      ph.pos.z = Math.sign(ph.pos.z) * BOUND;
      ph.speed *= 0.5;
    }

    // Sample terrain height for y; add gentle bob proportional to speed.
    const groundY = terrainHeight(ph.pos.x, ph.pos.z, road);
    const targetBob = Math.sin(performance.now() * 0.008) * 0.04 * speedFrac;
    ph.bob += (targetBob - ph.bob) * 0.1;
    const y = groundY + v.groundClearance + v.wheelRadius + ph.bob;

    // --- Update group transform --------------------------------------
    if (groupRef.current) {
      groupRef.current.position.set(ph.pos.x, y, ph.pos.z);
      groupRef.current.rotation.y = ph.heading;
      const roll = -steer * speedFrac * 0.04;
      groupRef.current.rotation.z = THREE.MathUtils.lerp(
        groupRef.current.rotation.z,
        roll,
        0.1,
      );
      const pitchTarget = throttle > 0 ? -0.02 : input.brake ? 0.04 : 0;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        pitchTarget,
        0.1,
      );
    }

    // --- Headlights ---------------------------------------------------
    const headlightsOn =
      state.headlightsOn ||
      state.timeOfDay < 6.5 ||
      state.timeOfDay > 18.5;
    if (headlightLRef.current) {
      headlightLRef.current.intensity = headlightsOn ? 6 : 0;
    }
    if (headlightRRef.current) {
      headlightRRef.current.intensity = headlightsOn ? 6 : 0;
    }
    if (brakeLightRef.current) {
      const braking = input.brake || (throttle < 0 && ph.speed > 0.5);
      brakeLightRef.current.emissiveIntensity = braking ? 2.5 : 0.1;
    }

    // --- Sync to store -----------------------------------------------
    state.setTelemetry({
      speed: ph.speed,
      heading: ph.heading,
      position: [ph.pos.x, y, ph.pos.z],
      fuel: state.fuel,
    });

    // --- Fuel burn ----------------------------------------------------
    if (throttle !== 0 && Math.abs(ph.speed) > 0.5) {
      const burn = v.fuelBurn * Math.abs(throttle) * dt * 0.5;
      useGame.setState({ fuel: Math.max(0, state.fuel - burn) });
    }
    if (useGame.getState().fuel <= 0) {
      ph.speed *= 1 - 0.5 * dt;
    }
  });

  return (
    <group ref={groupRef}>
      {/* GLB model, transformed to sit on the ground facing +Z. */}
      <group
        ref={modelGroupRef}
        scale={spec.modelScale}
        rotation={[0, spec.modelRotationY, 0]}
        position={[0, spec.modelOffsetY, 0]}
      >
        <primitive object={model} />
      </group>

      {/* Headlights (positioned at the front of the vehicle using the
          spec's dimensions so they line up regardless of model). */}
      <spotLight
        ref={headlightLRef}
        position={[spec.width * 0.35, spec.height * 0.5, spec.length * 0.5]}
        target-position={[spec.width * 0.35, 0, spec.length * 0.5 + 15]}
        angle={0.5}
        penumbra={0.6}
        distance={50}
        intensity={0}
        color="#fff5d0"
        castShadow={false}
      />
      <spotLight
        ref={headlightRRef}
        position={[-spec.width * 0.35, spec.height * 0.5, spec.length * 0.5]}
        target-position={[-spec.width * 0.35, 0, spec.length * 0.5 + 15]}
        angle={0.5}
        penumbra={0.6}
        distance={50}
        intensity={0}
        color="#fff5d0"
        castShadow={false}
      />

      {/* Brake light glow placed at the rear. Most GLBs already have
          brake lights in the texture; this adds extra emphasis when the
          player brakes. */}
      <mesh position={[0, spec.height * 0.5, -spec.length * 0.5 - 0.02]}>
        <planeGeometry args={[spec.width * 0.6, 0.06]} />
        <meshStandardMaterial
          ref={brakeLightRef}
          color="#ff2a1a"
          emissive="#ff2a1a"
          emissiveIntensity={0.1}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}

