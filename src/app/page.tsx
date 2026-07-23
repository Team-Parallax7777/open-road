// Main app entry. Dynamically imports the 3D game scene to keep it out
// of the SSR bundle, and switches between start menu, driving, and
// camping based on the game phase in the store.

"use client";

import dynamic from "next/dynamic";
import { useGame } from "@/game/store";
import { StartMenu } from "@/game/components/StartMenu";
import { Hud } from "@/game/components/Hud";
import { CampingOverlay } from "@/game/components/CampingOverlay";
import { CampDetector } from "@/game/components/CampDetector";
import { useEffect } from "react";

const GameScene = dynamic(
  () => import("@/game/components/GameScene").then((m) => m.GameScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white/60">
        <div className="text-center">
          <div className="mb-3 h-8 w-8 mx-auto rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
          <p className="text-sm">Preparing the road…</p>
        </div>
      </div>
    ),
  },
);

export default function Home() {
  const phase = useGame((s) => s.phase);
  const returnToMenu = useGame((s) => s.returnToMenu);

  // ESC returns to menu from driving.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" && useGame.getState().phase === "driving") {
        returnToMenu();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [returnToMenu]);

  if (phase === "menu") {
    return <StartMenu />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      <GameScene />
      <Hud />
      <CampDetector />
      {phase === "camping" && <CampingOverlay />}

      {/* Subtle top gradient for legibility */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
}
