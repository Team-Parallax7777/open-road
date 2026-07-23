// Camping overlay: shows when the player is at the campsite and chooses
// to rest. A calm full-screen scene with campfire ambience, a sleep
// option that fast-forwards to dawn/dusk, and a stargazing mode.

import { useEffect, useState } from "react";
import { useGame } from "../store";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Tent, Coffee, Moon, Sun, ArrowLeft, Star } from "lucide-react";

export function CampingOverlay() {
  const exitCamp = useGame((s) => s.exitCamp);
  const setTimeOfDay = useGame((s) => s.setTimeOfDay);
  const timeOfDay = useGame((s) => s.timeOfDay);
  const refuel = useGame((s) => s.refuel);

  const [stargazing, setStargazing] = useState(false);

  // Slowly refuel while camping.
  useEffect(() => {
    const id = setInterval(() => {
      refuel(0.4);
    }, 500);
    return () => clearInterval(id);
  }, [refuel]);

  const sleepUntil = (hour: number) => {
    setTimeOfDay(hour);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-zinc-950/90 via-zinc-900/85 to-black/90 backdrop-blur-md"
      >
        {/* Animated stars */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 80 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                top: `${(i * 37) % 100}%`,
                left: `${(i * 53) % 100}%`,
                width: `${1 + (i % 3)}px`,
                height: `${1 + (i % 3)}px`,
                opacity: 0.3 + ((i * 7) % 7) / 10,
                animation: `twinkle ${2 + (i % 4)}s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="relative z-10 max-w-md w-full mx-4 rounded-3xl border border-amber-500/20 bg-zinc-900/80 p-8 text-center text-white"
        >
          <div className="mb-4 inline-flex items-center justify-center h-14 w-14 rounded-full bg-amber-500/20 border border-amber-400/30">
            <Tent className="h-7 w-7 text-amber-300" />
          </div>
          <h2 className="text-2xl font-light mb-2">Camp by the river</h2>
          <p className="text-sm text-white/60 mb-6 leading-relaxed">
            The fire crackles. The kettle simmers. Far above, the sky turns
            slow. Rest a while — fuel will refill, and time will wait.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <Button
              variant="outline"
              onClick={() => sleepUntil(6.0)}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
            >
              <Sun className="h-4 w-4 mr-1.5" />
              Wake at dawn
            </Button>
            <Button
              variant="outline"
              onClick={() => sleepUntil(18.0)}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
            >
              <Moon className="h-4 w-4 mr-1.5" />
              Wait for dusk
            </Button>
            <Button
              variant="outline"
              onClick={() => setStargazing(true)}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
            >
              <Star className="h-4 w-4 mr-1.5" />
              Stargaze
            </Button>
            <Button
              variant="outline"
              onClick={() => sleepUntil((timeOfDay + 2) % 24)}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
            >
              <Coffee className="h-4 w-4 mr-1.5" />
              Brew tea
            </Button>
          </div>

          <Button
            onClick={exitCamp}
            className="w-full rounded-full bg-amber-500/90 text-zinc-950 hover:bg-amber-400"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to the road
          </Button>
        </motion.div>

        {/* Stargazing full screen */}
        <AnimatePresence>
          {stargazing && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStargazing(false)}
              className="absolute inset-0 z-20 cursor-pointer"
            >
              <div className="absolute inset-0 bg-black" />
              {Array.from({ length: 300 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    top: `${(i * 13) % 100}%`,
                    left: `${(i * 29) % 100}%`,
                    width: `${1 + (i % 4) * 0.5}px`,
                    height: `${1 + (i % 4) * 0.5}px`,
                    opacity: 0.4 + ((i * 11) % 6) / 10,
                    animation: `twinkle ${1.5 + (i % 5)}s ease-in-out infinite`,
                    animationDelay: `${(i % 10) * 0.2}s`,
                  }}
                />
              ))}
              <div className="absolute bottom-8 left-0 right-0 text-center text-white/60 text-sm">
                Tap anywhere to return
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
