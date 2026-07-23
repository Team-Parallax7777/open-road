// Central game store. Holds the player's chosen vehicle, camera mode,
// time of day, weather, fuel, speed, and whether the player is at a camp.
// All gameplay state lives here so the 3D scene and HUD stay in sync.

import { create } from "zustand";
import type { VehicleId } from "./vehicles";

export type CameraMode =
  | "chase"
  | "hood"
  | "cockpit"
  | "orbit"
  | "drone"
  | "cinematic";

export type Weather = "clear" | "rain" | "fog" | "snow";

export type GamePhase = "menu" | "driving" | "camping";

export interface GameState {
  phase: GamePhase;

  // Player choices
  vehicleId: VehicleId;
  cameraMode: CameraMode;

  // World state
  // timeOfDay in [0, 24). The Sky component translates this to sun position.
  timeOfDay: number;
  // autoTime: if true, time advances on its own. Player can also pause.
  timePaused: boolean;
  timeScale: number; // game hours per real second
  weather: Weather;

  // Driving telemetry (updated by Vehicle component each frame)
  speed: number; // m/s
  speedKmh: number; // km/h, derived
  heading: number; // radians, 0 = +Z (north)
  position: [number, number, number];
  fuel: number; // 0..100
  headlightsOn: boolean;
  wipersOn: boolean;
  indicatorsLeft: boolean;
  indicatorsRight: boolean;
  cruiseControl: boolean;
  cruiseSpeed: number; // m/s target

  // Camping
  atCamp: boolean;

  // Actions
  setVehicle: (id: VehicleId) => void;
  startGame: () => void;
  returnToMenu: () => void;
  setCameraMode: (m: CameraMode) => void;
  cycleCameraMode: () => void;
  setTimeOfDay: (t: number) => void;
  toggleTimePause: () => void;
  setTimeScale: (s: number) => void;
  setWeather: (w: Weather) => void;
  cycleWeather: () => void;
  setTelemetry: (t: {
    speed: number;
    heading: number;
    position: [number, number, number];
    fuel: number;
  }) => void;
  toggleHeadlights: () => void;
  toggleWipers: () => void;
  toggleLeftIndicator: () => void;
  toggleRightIndicator: () => void;
  toggleCruiseControl: () => void;
  refuel: (amount: number) => void;
  setAtCamp: (v: boolean) => void;
  enterCamp: () => void;
  exitCamp: () => void;
}

const CAMERA_ORDER: CameraMode[] = [
  "chase",
  "hood",
  "cockpit",
  "orbit",
  "drone",
  "cinematic",
];

const WEATHER_ORDER: Weather[] = ["clear", "fog", "rain", "snow"];

export const useGame = create<GameState>((set) => ({
  phase: "menu",

  vehicleId: "sedan",
  cameraMode: "chase",

  timeOfDay: 6.5, // sunrise start
  timePaused: false,
  timeScale: 0.15, // 1 game hour per ~6.6 real seconds — slow, calm pace
  weather: "clear",

  speed: 0,
  speedKmh: 0,
  heading: 0,
  position: [0, 0, 0],
  fuel: 100,
  headlightsOn: false,
  wipersOn: false,
  indicatorsLeft: false,
  indicatorsRight: false,
  cruiseControl: false,
  cruiseSpeed: 0,

  atCamp: false,

  setVehicle: (id) => set({ vehicleId: id }),
  startGame: () =>
    set({
      phase: "driving",
      speed: 0,
      speedKmh: 0,
      heading: 0,
      position: [0, 0, 0],
      fuel: 100,
      timeOfDay: 6.5,
    }),
  returnToMenu: () => set({ phase: "menu" }),

  setCameraMode: (m) => set({ cameraMode: m }),
  cycleCameraMode: () =>
    set((s) => {
      const i = CAMERA_ORDER.indexOf(s.cameraMode);
      const next = CAMERA_ORDER[(i + 1) % CAMERA_ORDER.length];
      return { cameraMode: next };
    }),

  setTimeOfDay: (t) => set({ timeOfDay: ((t % 24) + 24) % 24 }),
  toggleTimePause: () => set((s) => ({ timePaused: !s.timePaused })),
  setTimeScale: (s) => set({ timeScale: s }),
  setWeather: (w) => set({ weather: w }),
  cycleWeather: () =>
    set((s) => {
      const i = WEATHER_ORDER.indexOf(s.weather);
      return { weather: WEATHER_ORDER[(i + 1) % WEATHER_ORDER.length] };
    }),

  setTelemetry: (t) =>
    set({
      speed: t.speed,
      speedKmh: t.speed * 3.6,
      heading: t.heading,
      position: t.position,
      fuel: t.fuel,
    }),

  toggleHeadlights: () => set((s) => ({ headlightsOn: !s.headlightsOn })),
  toggleWipers: () => set((s) => ({ wipersOn: !s.wipersOn })),
  toggleLeftIndicator: () =>
    set((s) => ({
      indicatorsLeft: !s.indicatorsLeft,
      indicatorsRight: false,
    })),
  toggleRightIndicator: () =>
    set((s) => ({
      indicatorsRight: !s.indicatorsRight,
      indicatorsLeft: false,
    })),
  toggleCruiseControl: () =>
    set((s) => ({
      cruiseControl: !s.cruiseControl,
      cruiseSpeed: s.cruiseControl ? 0 : s.speed,
    })),
  refuel: (amount) =>
    set((s) => ({ fuel: Math.min(100, s.fuel + amount) })),

  setAtCamp: (v) => set({ atCamp: v }),
  enterCamp: () => set({ phase: "camping" }),
  exitCamp: () => set({ phase: "driving" }),
}));
