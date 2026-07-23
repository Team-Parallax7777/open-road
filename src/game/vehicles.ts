// Vehicle definitions for the driving experience.
// Each vehicle has unique handling, color, and silhouette so the journey
// feels different depending on what the player picks.
//
// Five of the six models are real GLB assets loaded from /public/models.
// The SUV (Land Rover Defender) is also a real GLB. All six are loaded
// via useGLTF in the Vehicle component.

export type VehicleId =
  | "golf_gti"
  | "new_beetle"
  | "bmw_m5"
  | "challenger"
  | "defender"
  | "hilux";

export interface VehicleSpec {
  id: VehicleId;
  name: string;
  category: "Hatchback" | "Sedan" | "SUV" | "Truck";
  description: string;
  year?: string;

  // Visual identity used in the menu UI (the actual body color comes
  // from the GLB material).
  accentColor: string;

  // GLB asset path (relative to /public). Null = use procedural body.
  modelPath: string;

  // Per-model transform hints. Each GLB ships at a different scale and
  // orientation; these values normalize them so every car sits ~4-5m
  // long, wheels on the ground, facing +Z (forward).
  modelScale: number; // uniform scale factor
  modelRotationY: number; // radians to rotate around Y to face +Z forward
  modelOffsetY: number; // vertical offset to drop wheels to y=0
  modelForwardAxis: "X" | "Z"; // which axis the model is naturally long along

  // Body proportions (meters) — used by the physics model and camera rig.
  length: number;
  width: number;
  height: number;
  wheelRadius: number;
  wheelbase: number;
  groundClearance: number;

  // Handling (arcade model)
  maxSpeed: number; // m/s
  acceleration: number; // m/s^2
  braking: number; // m/s^2
  reverseSpeed: number; // m/s
  turnRate: number; // rad/s at low speed
  grip: number; // 0..1, affects slip in rain/snow
  // Engine sound character
  engineNote: number; // base Hz for the idle oscillator
  // Fuel economy (units per second at full throttle)
  fuelBurn: number;
}

export const VEHICLES: Record<VehicleId, VehicleSpec> = {
  // --- Hatchbacks -----------------------------------------------------
  golf_gti: {
    id: "golf_gti",
    name: "VW Golf GTI Mk2",
    category: "Hatchback",
    year: "1992",
    description:
      "A pocket rocket from the golden era of hot hatches — light, eager, and instantly familiar.",
    accentColor: "#d4d4d8",
    modelPath: "/models/1992_volkswagen_golf_gti_mk2.glb",
    // Model ships at ~0.04m long; scale up to ~4m.
    modelScale: 100,
    modelRotationY: 0,
    modelOffsetY: 0,
    modelForwardAxis: "Z",
    length: 3.85,
    width: 1.69,
    height: 1.4,
    wheelRadius: 0.3,
    wheelbase: 2.4,
    groundClearance: 0.16,
    maxSpeed: 38,
    acceleration: 10,
    braking: 14,
    reverseSpeed: 8,
    turnRate: 2.0,
    grip: 0.86,
    engineNote: 80,
    fuelBurn: 0.55,
  },
  new_beetle: {
    id: "new_beetle",
    name: "VW New Beetle",
    category: "Hatchback",
    year: "1998",
    description:
      "Retro curves and a flower vase. Slow, cheerful, and impossible to drive without smiling.",
    accentColor: "#f5d76e",
    modelPath: "/models/1998_volkswagen_new_beetle.glb",
    modelScale: 100,
    modelRotationY: 0,
    modelOffsetY: 0,
    modelForwardAxis: "Z",
    length: 4.08,
    width: 1.73,
    height: 1.5,
    wheelRadius: 0.3,
    wheelbase: 2.51,
    groundClearance: 0.15,
    maxSpeed: 32,
    acceleration: 7.5,
    braking: 13,
    reverseSpeed: 8,
    turnRate: 1.85,
    grip: 0.84,
    engineNote: 72,
    fuelBurn: 0.6,
  },

  // --- Sedans ---------------------------------------------------------
  bmw_m5: {
    id: "bmw_m5",
    name: "BMW M5 CS",
    category: "Sedan",
    year: "2022",
    description:
      "A 627-hp super-sedan that hides its ferocity under a tailored suit. Fast, composed, and quietly menacing.",
    accentColor: "#1f2937",
    modelPath: "/models/2022_bmw_m5_cs.glb",
    // Model ships at ~0.05m long; scale up to ~5m.
    modelScale: 100,
    modelRotationY: 0,
    modelOffsetY: 0,
    modelForwardAxis: "Z",
    length: 4.96,
    width: 1.9,
    height: 1.47,
    wheelRadius: 0.36,
    wheelbase: 2.98,
    groundClearance: 0.14,
    maxSpeed: 56, // 250 km/h limited
    acceleration: 13,
    braking: 16,
    reverseSpeed: 10,
    turnRate: 1.6,
    grip: 0.93,
    engineNote: 60,
    fuelBurn: 1.0,
  },
  challenger: {
    id: "challenger",
    name: "Dodge Challenger SRT",
    category: "Sedan",
    description:
      "A wide-body American muscle car with a V8 bark. Brute force, slow steering, and a long hood.",
    accentColor: "#a3191b",
    modelPath: "/models/dodge_challenger_srt.glb",
    // Already real-world scale (~5m long).
    modelScale: 1,
    modelRotationY: 0,
    modelOffsetY: 0.124, // wheels currently below origin; lift up
    modelForwardAxis: "Z",
    length: 5.0,
    width: 2.14,
    height: 1.42,
    wheelRadius: 0.38,
    wheelbase: 2.95,
    groundClearance: 0.16,
    maxSpeed: 50, // ~180 mph
    acceleration: 12,
    braking: 15,
    reverseSpeed: 9,
    turnRate: 1.35,
    grip: 0.9,
    engineNote: 48,
    fuelBurn: 1.2,
  },

  // --- SUV ------------------------------------------------------------
  defender: {
    id: "defender",
    name: "Land Rover Defender",
    category: "SUV",
    description:
      "A go-anywhere icon in Grasmere Green. Tall, boxy, ready for river crossings and farmland mud.",
    accentColor: "#5a6b3a",
    modelPath: "/models/land_rover_defender_-_edition_grasmere_green.glb",
    // Model ships at 100m+ long — absurdly oversized. Scale down to real.
    modelScale: 0.05,
    modelRotationY: Math.PI / 2, // long axis is X; rotate to face +Z
    modelOffsetY: -0.5, // wheels currently above origin; drop down
    modelForwardAxis: "X",
    length: 4.75,
    width: 2.0,
    height: 1.97,
    wheelRadius: 0.42,
    wheelbase: 2.58,
    groundClearance: 0.29,
    maxSpeed: 36, // ~130 mph
    acceleration: 7,
    braking: 12,
    reverseSpeed: 8,
    turnRate: 1.5,
    grip: 0.92,
    engineNote: 54,
    fuelBurn: 0.95,
  },

  // --- Truck ----------------------------------------------------------
  hilux: {
    id: "hilux",
    name: "Toyota Hilux",
    category: "Truck",
    year: "2022",
    description:
      "The unkillable pickup. Heavy, deliberate, and unhurried — built for the long haul and the rough road.",
    accentColor: "#9ca3af",
    modelPath: "/models/2022_toyota_hilux.glb",
    // Already real-world scale.
    modelScale: 1,
    modelRotationY: 0,
    modelOffsetY: 0,
    modelForwardAxis: "Z",
    length: 5.33,
    width: 2.08,
    height: 1.89,
    wheelRadius: 0.44,
    wheelbase: 3.18,
    groundClearance: 0.31,
    maxSpeed: 30, // ~110 km/h
    acceleration: 5.5,
    braking: 10,
    reverseSpeed: 7,
    turnRate: 1.2,
    grip: 0.94,
    engineNote: 44,
    fuelBurn: 1.1,
  },
};

export const VEHICLE_LIST = Object.values(VEHICLES);
