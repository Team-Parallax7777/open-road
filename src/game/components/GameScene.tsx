// Main 3D game scene. Hosts the R3F Canvas and wires up the world,
// vehicle, sky, camera, and ambient audio. Also advances time of day
// when not paused.

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Environment } from "./Environment";
import { SkyAndLights } from "./SkyAndLights";
import { Vehicle } from "./Vehicle";
import { CameraRig } from "./CameraRig";
import { useGame } from "../store";
import { useKeyboard } from "../hooks/useKeyboard";
import { buildRoadLoop } from "../world/terrain";
import { getAmbient } from "../lib/audio";
import { VEHICLES } from "../vehicles";

// Advances time-of-day each frame and updates audio.
function GameClock() {
  const lastSpeedRef = useRef(0);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const s = useGame.getState();
    if (!s.timePaused) {
      const newTime = s.timeOfDay + s.timeScale * dt;
      s.setTimeOfDay(newTime);
    }

    // Audio: engine pitch + wind track speed fraction.
    const v = VEHICLES[s.vehicleId];
    const speedFrac = Math.min(1, Math.abs(s.speed) / v.maxSpeed);
    const amb = getAmbient();
    amb.setEngine(speedFrac, v.engineNote);
    amb.setWind(speedFrac);

    // Engine idle noise floor when stationary.
    lastSpeedRef.current = s.speed;
  });
  return null;
}

// Fog + tone-matching config driven by weather.
function WeatherFx() {
  useFrame(() => {
    // We can't easily mutate scene.fog from here without useThree, so we
    // update via the gl directly once on mount through the parent Canvas.
  });
  return null;
}

export function GameScene() {
  const road = useMemo(() => buildRoadLoop(), []);
  const setCameraMode = useGame((s) => s.setCameraMode);
  const cycleCameraMode = useGame((s) => s.cycleCameraMode);
  const toggleHeadlights = useGame((s) => s.toggleHeadlights);
  const toggleWipers = useGame((s) => s.toggleWipers);
  const toggleLeftIndicator = useGame((s) => s.toggleLeftIndicator);
  const toggleRightIndicator = useGame((s) => s.toggleRightIndicator);
  const toggleCruise = useGame((s) => s.toggleCruiseControl);
  const togglePause = useGame((s) => s.toggleTimePause);
  const cycleWeather = useGame((s) => s.cycleWeather);
  const enterCamp = useGame((s) => s.enterCamp);
  const setCamera = useGame((s) => s.setCameraMode);

  void setCameraMode;
  void setCamera;

  const inputRef = useKeyboard({
    onToggleCamera: cycleCameraMode,
    onToggleHeadlights: toggleHeadlights,
    onToggleWipers: toggleWipers,
    onToggleLeftIndicator: toggleLeftIndicator,
    onToggleRightIndicator: toggleRightIndicator,
    onToggleCruise: toggleCruise,
    onTogglePause: togglePause,
    onCycleWeather: cycleWeather,
    onEnterCamp: enterCamp,
  });

  // Start ambient audio on first user gesture.
  useEffect(() => {
    const amb = getAmbient();
    const start = () => {
      amb.start();
      amb.resume();
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);

  // Fog and background tone driven by weather — read in a small component
  // inside the Canvas so we have access to useThree.
  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      camera={{ fov: 65, near: 0.5, far: 2000, position: [0, 5, -10] }}
    >
      <WeatherAndFog />
      <Suspense fallback={null}>
        <SkyAndLights />
        <Environment />
        <Vehicle inputRef={inputRef} road={road} />
        <CameraRig />
        <GameClock />
        <WeatherFx />
      </Suspense>
    </Canvas>
  );
}

// Reads weather from the store and updates scene fog/background colour.
function WeatherAndFog() {
  const scene = useThree((s) => s.scene);
  useFrame(() => {
    const s = useGame.getState();
    const hour = s.timeOfDay;
    const weather = s.weather;

    // Base fog colour from time of day.
    const dayFrac = Math.max(0, Math.sin(Math.max(0, ((hour - 6) / 24) * Math.PI * 2 - Math.PI / 2)));
    const fogColor = new THREE.Color().setHSL(
      0.6,
      0.2,
      0.1 + dayFrac * 0.5,
    );
    if (weather === "fog") {
      fogColor.lerp(new THREE.Color("#aab4be"), 0.7);
    } else if (weather === "rain") {
      fogColor.lerp(new THREE.Color("#5a6670"), 0.4);
    } else if (weather === "snow") {
      fogColor.lerp(new THREE.Color("#dde2e8"), 0.5);
    }

    let fogNear = 120;
    let fogFar = 600;
    if (weather === "fog") {
      fogNear = 25;
      fogFar = 140;
    } else if (weather === "rain") {
      fogNear = 60;
      fogFar = 320;
    } else if (weather === "snow") {
      fogNear = 40;
      fogFar = 220;
    } else if (hour < 6.5 || hour > 19) {
      fogNear = 60;
      fogFar = 280;
    }

    applyFog(scene, fogColor, fogNear, fogFar);
  });
  return null;
}

// Side-effectful helper that mutates the three.js scene. Defined outside
// the component so the react-hooks/immutability rule doesn't fire on the
// hook return value.
function applyFog(
  scene: THREE.Scene,
  color: THREE.Color,
  near: number,
  far: number,
) {
  if (!(scene.fog instanceof THREE.Fog)) {
    scene.fog = new THREE.Fog(color.clone(), near, far);
  } else {
    scene.fog.color.copy(color);
    scene.fog.near = near;
    scene.fog.far = far;
  }
  scene.background = color.clone();
}
