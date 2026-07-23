// Camera rig: switches between chase / hood / cockpit / orbit / drone /
// cinematic modes. Reads player position + heading from the store each
// frame and updates the active camera.
//
// We don't use OrbitControls because most modes need to follow the
// vehicle. The "orbit" mode is a slow auto-rotation around the car for
// admiring the view.

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "../store";
import { VEHICLES } from "../vehicles";

export function CameraRig() {
  const { camera } = useThree();
  const orbitAngle = useRef(0);
  const cineTime = useRef(0);
  const tmp = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const state = useGame.getState();
    const v = VEHICLES[state.vehicleId];
    const [px, py, pz] = state.position;
    const heading = state.heading;

    const carPos = tmp.current.set(px, py, pz);
    const fwd = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const back = fwd.clone().multiplyScalar(-1);
    const up = new THREE.Vector3(0, 1, 0);

    let desiredPos = new THREE.Vector3();
    let desiredLook = carPos.clone();

    switch (state.cameraMode) {
      case "chase": {
        desiredPos = carPos
          .clone()
          .add(back.clone().multiplyScalar(7.5))
          .add(up.clone().multiplyScalar(3.5 + v.height * 0.5));
        desiredLook = carPos.clone().add(fwd.clone().multiplyScalar(4));
        break;
      }
      case "hood": {
        const hoodY = v.height + 0.2;
        desiredPos = carPos
          .clone()
          .add(up.clone().multiplyScalar(hoodY))
          .add(fwd.clone().multiplyScalar(v.length * 0.5));
        desiredLook = carPos
          .clone()
          .add(up.clone().multiplyScalar(hoodY - 0.3))
          .add(fwd.clone().multiplyScalar(v.length * 0.5 + 10));
        break;
      }
      case "cockpit": {
        const cockpitY = v.height * 0.85;
        desiredPos = carPos
          .clone()
          .add(up.clone().multiplyScalar(cockpitY))
          .add(fwd.clone().multiplyScalar(-0.2));
        desiredLook = carPos
          .clone()
          .add(up.clone().multiplyScalar(cockpitY - 0.1))
          .add(fwd.clone().multiplyScalar(15));
        break;
      }
      case "orbit": {
        orbitAngle.current += dt * 0.3;
        const r = 9;
        desiredPos = carPos
          .clone()
          .add(
            new THREE.Vector3(
              Math.cos(orbitAngle.current) * r,
              4 + v.height * 0.4,
              Math.sin(orbitAngle.current) * r,
            ),
          );
        desiredLook = carPos.clone();
        break;
      }
      case "drone": {
        // High aerial follow.
        desiredPos = carPos
          .clone()
          .add(back.clone().multiplyScalar(14))
          .add(up.clone().multiplyScalar(22));
        desiredLook = carPos.clone();
        break;
      }
      case "cinematic": {
        // Slow pan around the car with a wider lens feel.
        cineTime.current += dt * 0.15;
        const t = cineTime.current;
        const r = 12 + Math.sin(t * 0.7) * 4;
        const y = 3 + Math.sin(t * 0.4) * 2;
        desiredPos = carPos
          .clone()
          .add(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r));
        desiredLook = carPos.clone().add(up.clone().multiplyScalar(0.5));
        break;
      }
    }

    // Smooth camera movement for chase/hood/cockpit; snappier for orbit/cine.
    const lerpFactor =
      state.cameraMode === "orbit" ||
      state.cameraMode === "cinematic" ||
      state.cameraMode === "drone"
        ? 0.05
        : 0.15;
    camera.position.lerp(desiredPos, lerpFactor);
    lookTarget.current.lerp(desiredLook, 0.2);
    camera.lookAt(lookTarget.current);

    // Adjust fov a bit for cinematic.
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov =
        state.cameraMode === "cinematic"
          ? 50
          : state.cameraMode === "drone"
            ? 55
            : 65;
      setFov(camera, targetFov);
    }
  });

  return null;
}

// Defined outside the component to avoid the react-hooks/immutability rule
// firing on the camera hook return value.
function setFov(camera: THREE.PerspectiveCamera, targetFov: number) {
  camera.fov += (targetFov - camera.fov) * 0.05;
  camera.updateProjectionMatrix();
}
