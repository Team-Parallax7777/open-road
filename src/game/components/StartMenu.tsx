// Start menu. Lets the player pick a vehicle, see the tagline, and
// begin the drive. Designed to feel calm and inviting — soft gradient
// backdrop, generous spacing, no aggressive CTAs.

import { useGame } from "../store";
import { VEHICLE_LIST, type VehicleId } from "../vehicles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ChevronRight, Car } from "lucide-react";
import { VehicleBadge3D } from "./VehicleBadge3D";

export function StartMenu() {
  const vehicleId = useGame((s) => s.vehicleId);
  const setVehicle = useGame((s) => s.setVehicle);
  const startGame = useGame((s) => s.startGame);

  return (
    <div className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-white">
      {/* Ambient glow */}
      <div
        className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #f4a261 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #2a6f7a 0%, transparent 70%)" }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0 }}
          className="text-center mb-10"
        >
          <div className="mb-3 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
            <Car className="h-3 w-3" />
            Open Road
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight">
            Drive without a
            <br />
            <span className="italic text-amber-300/90">destination</span>
          </h1>
          <p className="mt-5 max-w-md mx-auto text-sm md:text-base lg:text-lg text-white/60 leading-relaxed">
            A relaxing open-world drive through forest, village, and river.
            No timers. No scores. No missions. Only the road, the weather,
            and the rhythm of the journey.
          </p>
        </motion.div>

        {/* Vehicle selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.2 }}
          className="w-full max-w-6xl"
        >
          <div className="mb-4 text-center">
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/40">
              Choose your vehicle
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {VEHICLE_LIST.map((v) => {
              const active = v.id === vehicleId;
              return (
                <button
                  key={v.id}
                  onClick={() => setVehicle(v.id as VehicleId)}
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? "border-amber-400/60 bg-amber-400/5"
                      : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
                  }`}
                >
                  {/* 3D badge (with CSS fallback underneath in case WebGL is unavailable) */}
                  <div
                    className="relative h-28 mb-3 rounded-lg overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-900"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${v.accentColor}22 0%, ${v.accentColor}44 100%)`,
                    }}
                  >
                    {/* CSS car silhouette fallback shown until the GLB loads */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        viewBox="0 0 80 40"
                        className="h-12 w-24 opacity-40"
                        fill={v.accentColor}
                      >
                        <path d="M8 28 L8 24 Q8 18 14 18 L24 18 L30 10 Q32 8 36 8 L52 8 Q56 8 58 12 L62 18 L70 18 Q74 18 74 24 L74 28 L66 28 Q66 32 62 32 Q58 32 58 28 L24 28 Q24 32 20 32 Q16 32 16 28 Z" />
                        <circle cx="20" cy="29" r="4" fill="#1a1a1a" />
                        <circle cx="62" cy="29" r="4" fill="#1a1a1a" />
                      </svg>
                    </div>
                    <VehicleBadge3D
                      vehicleId={v.id}
                      accentColor={v.accentColor}
                      active={active}
                    />
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{v.name}</span>
                      {v.year && (
                        <span className="text-[10px] text-white/40">{v.year}</span>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1.5 border-white/20 text-white/60"
                    >
                      {v.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/50 leading-snug min-h-[2.4em]">
                    {v.description}
                  </p>

                  {/* Stats */}
                  <div className="mt-3 grid grid-cols-3 gap-1 text-[10px]">
                    <Stat label="Speed" value={`${Math.round(v.maxSpeed * 3.6)}`} />
                    <Stat label="Grip" value={`${Math.round(v.grip * 100)}`} />
                    <Stat label="Agility" value={`${Math.round(v.turnRate * 50)}`} />
                  </div>

                  {active && (
                    <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.4 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <Button
            onClick={startGame}
            size="lg"
            className="group rounded-full bg-amber-500/90 text-zinc-950 hover:bg-amber-400 px-8 py-6 text-base font-medium"
          >
            Begin the journey
            <ChevronRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
          </Button>
          <p className="text-[11px] text-white/40">
            Tip: click anywhere on the road after entering to enable audio.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/5 px-1.5 py-1 text-center">
      <div className="text-white/80 font-medium">{value}</div>
      <div className="text-white/40 uppercase tracking-wider">{label}</div>
    </div>
  );
}
