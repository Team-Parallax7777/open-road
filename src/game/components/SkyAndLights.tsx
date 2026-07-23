// Sky + lighting driven by the time-of-day value in the game store.
// We compute a sun position from the hour, drive directional light +
// ambient + hemisphere intensities, fog colour, and a gradient skybox.
//
// We also render stars at night and a soft moon. Clouds are left to a
// simple shader-less plane to keep performance budget for the car.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../store";

// Convert time-of-day [0,24) to a sun elevation/azimuth.
function sunAt(hour: number): { elev: number; azim: number } {
  // 6:00 = sunrise (east, 0 elevation), 12 = noon (90), 18 = sunset (0), 0/24 = midnight (-90).
  const t = (hour - 6) / 24; // 0 at sunrise, 0.5 at sunset
  const angle = t * Math.PI * 2; // full revolution per day
  const elev = Math.sin(angle - Math.PI / 2) * 1.05; // peaks at noon
  const azim = (hour / 24) * Math.PI * 2;
  return { elev, azim };
}

// Colour stops for the sky gradient by hour.
const SKY_TOP = [
  { h: 0, c: new THREE.Color("#05060f") }, // midnight
  { h: 5, c: new THREE.Color("#10162e") }, // pre-dawn
  { h: 6.5, c: new THREE.Color("#3a4a7a") }, // dawn
  { h: 7.5, c: new THREE.Color("#ffb27a") }, // golden hour
  { h: 9, c: new THREE.Color("#7fb6e8") }, // morning
  { h: 12, c: new THREE.Color("#5fa6e0") }, // noon
  { h: 16, c: new THREE.Color("#86b6e0") }, // afternoon
  { h: 17.5, c: new THREE.Color("#ffb27a") }, // golden hour
  { h: 19, c: new THREE.Color("#3a4a7a") }, // dusk
  { h: 20.5, c: new THREE.Color("#10162e") }, // blue hour
  { h: 24, c: new THREE.Color("#05060f") },
];

const SKY_BOTTOM = [
  { h: 0, c: new THREE.Color("#0a0d1a") },
  { h: 5, c: new THREE.Color("#1d2440") },
  { h: 6.5, c: new THREE.Color("#e07a4a") },
  { h: 7.5, c: new THREE.Color("#ffd9a0") },
  { h: 9, c: new THREE.Color("#cfe6f6") },
  { h: 12, c: new THREE.Color("#cfe6f6") },
  { h: 16, c: new THREE.Color("#cfe6f6") },
  { h: 17.5, c: new THREE.Color("#ffd9a0") },
  { h: 19, c: new THREE.Color("#e07a4a") },
  { h: 20.5, c: new THREE.Color("#1d2440") },
  { h: 24, c: new THREE.Color("#0a0d1a") },
];

function sample(stops: { h: number; c: THREE.Color }[], hour: number) {
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (hour >= stops[i].h && hour <= stops[i + 1].h) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const t = (hour - a.h) / Math.max(0.001, b.h - a.h);
  return a.c.clone().lerp(b.c, THREE.MathUtils.clamp(t, 0, 1));
}

export function SkyAndLights() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const moonRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const ambRef = useRef<THREE.AmbientLight>(null);
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);

  // Pre-generate a star field.
  const starsGeo = useMemo(() => {
    const N = 1500;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // Hemisphere distribution above horizon.
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(v);
      const r = 900;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const skyMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color("#5fa6e0") },
        bottomColor: { value: new THREE.Color("#cfe6f6") },
        offset: { value: 33 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos + vec3(0.0, offset, 0.0)).y;
          float t = pow(max(h, 0.0), exponent);
          gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
        }
      `,
    });
  }, []);

  useFrame(() => {
    const hour = useGame.getState().timeOfDay;
    const weather = useGame.getState().weather;
    const { elev, azim } = sunAt(hour);

    const sunDir = new THREE.Vector3(
      Math.cos(elev) * Math.cos(azim),
      Math.sin(elev),
      Math.cos(elev) * Math.sin(azim),
    );

    if (sunRef.current) {
      sunRef.current.position.copy(sunDir.clone().multiplyScalar(300));
      sunRef.current.target.position.set(0, 0, 0);
      sunRef.current.target.updateMatrixWorld();
      // Intensity: bright at noon, dim at night.
      const dayFrac = THREE.MathUtils.clamp(Math.sin(Math.max(0, elev)), 0, 1);
      let intensity = dayFrac * 2.4 + 0.05;
      // Weather dampens light.
      if (weather === "fog") intensity *= 0.55;
      if (weather === "rain") intensity *= 0.45;
      if (weather === "snow") intensity *= 0.6;
      sunRef.current.intensity = intensity;

      // Warm at golden hours, neutral at noon.
      const golden = Math.max(0, 1 - Math.abs(elev) / 0.4);
      const color = new THREE.Color("#fff5e0").lerp(
        new THREE.Color("#ff9a5a"),
        golden,
      );
      sunRef.current.color.copy(color);
    }
    if (sunMeshRef.current) {
      sunMeshRef.current.position.copy(sunDir.clone().multiplyScalar(800));
      const visible = elev > -0.1 ? 1 : 0;
      sunMeshRef.current.visible = visible > 0;
      const mat = sunMeshRef.current.material as THREE.MeshBasicMaterial;
      const golden = Math.max(0, 1 - Math.abs(elev) / 0.5);
      mat.color.copy(new THREE.Color("#fff8d0").lerp(new THREE.Color("#ff8a3a"), golden));
    }

    // Moon: opposite of sun.
    const moonDir = sunDir.clone().multiplyScalar(-1);
    if (moonRef.current) {
      moonRef.current.position.copy(moonDir.clone().multiplyScalar(300));
      moonRef.current.target.position.set(0, 0, 0);
      moonRef.current.target.updateMatrixWorld();
      const moonFrac = THREE.MathUtils.clamp(-Math.sin(elev), 0, 1);
      moonRef.current.intensity = moonFrac * 0.5;
    }
    if (moonMeshRef.current) {
      moonMeshRef.current.position.copy(moonDir.clone().multiplyScalar(800));
      moonMeshRef.current.visible = elev < 0.05;
    }
    if (starsRef.current) {
      starsRef.current.visible = elev < 0.0;
      const mat = starsRef.current.material as THREE.PointsMaterial;
      mat.opacity = THREE.MathUtils.clamp(-elev * 4, 0, 1);
    }

    if (hemiRef.current) {
      const dayFrac = THREE.MathUtils.clamp(Math.sin(Math.max(0, elev)), 0, 1);
      hemiRef.current.intensity = 0.3 + dayFrac * 0.5;
      const sky = sample(SKY_TOP, hour);
      hemiRef.current.color.copy(sky);
      hemiRef.current.groundColor.set("#3a2c1a");
    }
    if (ambRef.current) {
      const dayFrac = THREE.MathUtils.clamp(Math.sin(Math.max(0, elev)), 0, 1);
      ambRef.current.intensity = 0.15 + dayFrac * 0.25;
    }

    // Sky gradient.
    const top = sample(SKY_TOP, hour);
    const bot = sample(SKY_BOTTOM, hour);
    // Weather tints toward grey.
    if (weather === "fog" || weather === "rain") {
      const grey = new THREE.Color("#9aa3ad");
      top.lerp(grey, 0.55);
      bot.lerp(grey, 0.55);
    } else if (weather === "snow") {
      const grey = new THREE.Color("#cfd4da");
      top.lerp(grey, 0.4);
      bot.lerp(grey, 0.4);
    }
    skyMaterial.uniforms.topColor.value.copy(top);
    skyMaterial.uniforms.bottomColor.value.copy(bot);
  });

  return (
    <>
      <mesh material={skyMaterial} scale={[1, 1, 1]} renderOrder={-1}>
        <sphereGeometry args={[1000, 32, 16]} />
      </mesh>

      <ambientLight ref={ambRef} intensity={0.3} />
      <hemisphereLight ref={hemiRef} intensity={0.6} />
      <directionalLight
        ref={sunRef}
        castShadow
        intensity={2.0}
        color="#fff5e0"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={800}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-bias={-0.0005}
      />
      <directionalLight ref={moonRef} intensity={0.2} color="#9fb4d8" />

      <mesh ref={sunMeshRef}>
        <sphereGeometry args={[28, 24, 24]} />
        <meshBasicMaterial color="#fff8d0" toneMapped={false} />
      </mesh>
      <mesh ref={moonMeshRef}>
        <sphereGeometry args={[16, 24, 24]} />
        <meshBasicMaterial color="#e5ecf5" toneMapped={false} />
      </mesh>

      <points ref={starsRef} geometry={starsGeo} visible={false}>
        <pointsMaterial
          color="#ffffff"
          size={1.6}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </points>
    </>
  );
}
