// Detects when the player is near the campsite and updates the store
// so the HUD can show the "Rest at Camp" prompt. Lives outside the
// Canvas because it doesn't need to render anything 3D.

import { useEffect } from "react";
import { useGame } from "../store";
import { CAMP_POSITION } from "../world/terrain";

export function CampDetector() {
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = useGame.getState();
      if (s.phase === "driving") {
        const [px, , pz] = s.position;
        const dx = px - CAMP_POSITION[0];
        const dz = pz - CAMP_POSITION[2];
        const dist = Math.hypot(dx, dz);
        const near = dist < 14;
        if (near !== s.atCamp) {
          s.setAtCamp(near);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}
