// Procedural world geometry for the Phase 1 vertical slice.
// A ~2km x 2km valley with: forest, Indian village cluster, farmland,
// river with a bridge, lake, waterfall, campsite, and a scenic loop road.
//
// Everything is generated from deterministic seeded noise so it looks
// organic but stays stable across reloads.

import { useMemo } from "react";
import * as THREE from "three";

// --- Seeded PRNG (mulberry32) -------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- World constants -----------------------------------------------------
const WORLD_SIZE = 600; // half-extent in meters (so 1200x1200 visible)
export const ROAD_HALF_WIDTH = 6;

// The road is a closed loop parametrised by an angle. We sample it once
// and store positions; the vehicle component uses these to know if the
// player is on the road.
export interface RoadPoint {
  x: number;
  z: number;
  nx: number; // outward normal x
  nz: number; // outward normal z
}

export function buildRoadLoop(): RoadPoint[] {
  const pts: RoadPoint[] = [];
  const N = 220;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    // A wobbly racetrack-ish oval so the loop has character.
    const r = 280 + Math.sin(t * 3) * 35 + Math.cos(t * 2) * 22;
    const x = Math.cos(t) * r;
    const z = Math.sin(t) * r * 0.82;
    pts.push({ x, z, nx: 0, nz: 0 });
  }
  // Compute outward normals from centroid.
  let cx = 0;
  let cz = 0;
  for (const p of pts) {
    cx += p.x;
    cz += p.z;
  }
  cx /= pts.length;
  cz /= pts.length;
  for (const p of pts) {
    const dx = p.x - cx;
    const dz = p.z - cz;
    const len = Math.hypot(dx, dz) || 1;
    p.nx = dx / len;
    p.nz = dz / len;
  }
  return pts;
}

export function distanceToRoad(x: number, z: number, road: RoadPoint[]) {
  let best = Infinity;
  for (const p of road) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < best) best = d;
  }
  return best;
}

// Height function. Returns y (meters) for a world x/z.
// Road corridor is flattened; farmland flattened near origin; hills rise
// toward the forest edge.
export function terrainHeight(x: number, z: number, road: RoadPoint[]) {
  const distRoad = distanceToRoad(x, z, road);
  const onRoad = Math.max(0, 1 - distRoad / (ROAD_HALF_WIDTH + 4));

  // Gentle rolling hills everywhere.
  const h =
    Math.sin(x * 0.012) * 3.5 +
    Math.cos(z * 0.009) * 3.0 +
    Math.sin((x + z) * 0.005) * 5.0 +
    1.5;

  // A river channel that cuts through the world (near x=0).
  const riverDepth = Math.exp(-Math.pow(x / 22, 2)) * 6;
  const riverAdjusted = h - riverDepth;

  // Flatten the road corridor.
  const blended = riverAdjusted * (1 - onRoad) + 0.2 * onRoad;
  return blended;
}

// --- Tree scatter --------------------------------------------------------
export interface ScatterItem {
  x: number;
  z: number;
  y: number;
  scale: number;
  rotation: number;
  kind: "pine" | "broadleaf" | "bush" | "rock";
}

export function scatterForest(road: RoadPoint[]): ScatterItem[] {
  const rng = mulberry32(1337);
  const items: ScatterItem[] = [];
  const N = 320;
  for (let i = 0; i < N; i++) {
    const x = (rng() - 0.5) * WORLD_SIZE * 1.8;
    const z = (rng() - 0.5) * WORLD_SIZE * 1.8;
    // Keep trees off the road and out of the river.
    const distRoad = distanceToRoad(x, z, road);
    if (distRoad < 9) continue;
    const riverProximity = Math.exp(-Math.pow(x / 18, 2));
    if (riverProximity > 0.3) continue;
    // Keep a clearing around the village centre (negative quadrant).
    const distVillage = Math.hypot(x + 120, z + 90);
    if (distVillage < 40) continue;
    // Keep a clearing around the campsite.
    const distCamp = Math.hypot(x - 180, z + 120);
    if (distCamp < 22) continue;

    const y = terrainHeight(x, z, road);
    const r = rng();
    const kind: ScatterItem["kind"] =
      r < 0.55 ? "pine" : r < 0.85 ? "broadleaf" : r < 0.93 ? "bush" : "rock";
    items.push({
      x,
      z,
      y,
      scale: 0.7 + rng() * 0.9,
      rotation: rng() * Math.PI * 2,
      kind,
    });
  }
  return items;
}

// --- Village huts --------------------------------------------------------
export interface Hut {
  x: number;
  z: number;
  y: number;
  rot: number;
  scale: number;
  wallColor: string;
  roofColor: string;
}

export function scatterVillage(road: RoadPoint[]): Hut[] {
  const rng = mulberry32(7);
  const huts: Hut[] = [];
  const cx = -120;
  const cz = -90;
  const N = 14;
  const wallPalette = ["#d9b88a", "#c89a6a", "#b88454", "#e0c79a"];
  const roofPalette = ["#5b3a1f", "#6e4a25", "#7a5230", "#4a2f18"];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rng() * 0.4;
    const r = 8 + rng() * 24;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    if (distanceToRoad(x, z, road) < 14) continue;
    huts.push({
      x,
      z,
      y: terrainHeight(x, z, road),
      rot: rng() * Math.PI * 2,
      scale: 0.85 + rng() * 0.4,
      wallColor: wallPalette[Math.floor(rng() * wallPalette.length)],
      roofColor: roofPalette[Math.floor(rng() * roofPalette.length)],
    });
  }
  return huts;
}

// --- Bridge placement ---------------------------------------------------
// The bridge spans the river at z=0 along the x axis near the road
// crossing point. We compute where the road loop crosses z ~= 0.
export function findBridge(road: RoadPoint[]) {
  // Find a road point near z=0 in the +x half.
  let best = road[0];
  let bestAbs = Infinity;
  for (const p of road) {
    if (p.x < 0) continue;
    const a = Math.abs(p.z);
    if (a < bestAbs) {
      bestAbs = a;
      best = p;
    }
  }
  return { x: best.x, z: 0 };
}

// --- Campsite -----------------------------------------------------------
export const CAMP_POSITION: [number, number, number] = [180, 0, -120];

// --- Terrain mesh builder ------------------------------------------------
export function useTerrainGeometry(road: RoadPoint[]) {
  return useMemo(() => {
    const SEG = 200; // resolution
    const size = WORLD_SIZE * 2;
    const geo = new THREE.PlaneGeometry(size, size, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);

    const grass = new THREE.Color("#4a6b3a");
    const grassDark = new THREE.Color("#3a5a2c");
    const dirt = new THREE.Color("#6b5436");
    const road = new THREE.Color("#3a3a3e");
    const sand = new THREE.Color("#b89a6a");
    const water = new THREE.Color("#2a4a5a");

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = terrainHeight(x, z, road);
      pos.setY(i, h);

      const distRoad = distanceToRoad(x, z, road);
      const riverProximity = Math.exp(-Math.pow(x / 18, 2));

      const c = new THREE.Color();
      if (riverProximity > 0.55 && h < 0.5) {
        c.copy(water);
      } else if (riverProximity > 0.25) {
        c.lerpColors(sand, grass, 1 - riverProximity);
      } else if (distRoad < ROAD_HALF_WIDTH) {
        c.copy(road);
      } else if (distRoad < ROAD_HALF_WIDTH + 2.5) {
        c.lerpColors(road, dirt, (distRoad - ROAD_HALF_WIDTH) / 2.5);
      } else {
        // Grass with subtle variation, darker on hills.
        const variation = (Math.sin(x * 0.05) + Math.cos(z * 0.04)) * 0.5;
        c.lerpColors(grass, grassDark, Math.max(0, variation) * 0.5 + h * 0.05);
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [road]);
}

export { WORLD_SIZE };
