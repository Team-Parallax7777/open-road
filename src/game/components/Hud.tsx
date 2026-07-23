// In-game HUD overlay. Sits on top of the 3D canvas. Shows:
//   - Top-left: time of day, weather, controls help toggle
//   - Bottom-left: minimal speed + fuel + compass
//   - Bottom-right: camera mode, indicator status, headlights, wipers
//   - Bottom-center: cruise control state
// The HUD is intentionally unobtrusive — atmosphere over UI.

import { useState } from "react";
import { useGame } from "../store";
import { VEHICLES } from "../vehicles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudFog,
  CloudSnow,
  Camera,
  Lightbulb,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Gauge,
  HelpCircle,
  X,
  Tent,
  Pause,
  Play,
  Fuel,
} from "lucide-react";

const CAMERA_LABELS: Record<string, string> = {
  chase: "Chase",
  hood: "Hood",
  cockpit: "Cockpit",
  orbit: "Orbit",
  drone: "Drone",
  cinematic: "Cinematic",
};

const WEATHER_ICON = {
  clear: Sun,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
} as const;

export function Hud() {
  const {
    speedKmh,
    fuel,
    heading,
    timeOfDay,
    weather,
    cameraMode,
    headlightsOn,
    wipersOn,
    indicatorsLeft,
    indicatorsRight,
    cruiseControl,
    cruiseSpeed,
    vehicleId,
    timePaused,
    atCamp,
  } = useGame();

  const cycleCameraMode = useGame((s) => s.cycleCameraMode);
  const toggleHeadlights = useGame((s) => s.toggleHeadlights);
  const toggleWipers = useGame((s) => s.toggleWipers);
  const toggleLeft = useGame((s) => s.toggleLeftIndicator);
  const toggleRight = useGame((s) => s.toggleRightIndicator);
  const toggleCruise = useGame((s) => s.toggleCruiseControl);
  const togglePause = useGame((s) => s.toggleTimePause);
  const cycleWeather = useGame((s) => s.cycleWeather);
  const setTimeOfDay = useGame((s) => s.setTimeOfDay);
  const enterCamp = useGame((s) => s.enterCamp);

  const [showHelp, setShowHelp] = useState(false);

  const v = VEHICLES[vehicleId];
  const WeatherIcon = WEATHER_ICON[weather];
  const isNight = timeOfDay < 6.5 || timeOfDay > 19;
  const hour = Math.floor(timeOfDay);
  const minute = Math.floor((timeOfDay - hour) * 60);
  const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

  // Compass heading -> N/E/S/W
  const deg = ((heading * 180) / Math.PI + 360) % 360;
  const compassDir =
    deg < 22.5 || deg >= 337.5
      ? "N"
      : deg < 67.5
        ? "NE"
        : deg < 112.5
          ? "E"
          : deg < 157.5
            ? "SE"
            : deg < 202.5
              ? "S"
              : deg < 247.5
                ? "SW"
                : deg < 292.5
                  ? "W"
                  : "NW";

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-4 md:p-6">
        <div className="pointer-events-auto flex items-center gap-2">
          <Badge
            variant="secondary"
            className="gap-1.5 bg-black/50 text-white backdrop-blur-md border-white/10"
          >
            {isNight ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
            {timeStr}
          </Badge>
          <button
            onClick={cycleWeather}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-md border border-white/10 hover:bg-black/70 transition"
          >
            <WeatherIcon className="h-3 w-3" />
            <span className="capitalize">{weather}</span>
          </button>
          <button
            onClick={togglePause}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-md border border-white/10 hover:bg-black/70 transition"
          >
            {timePaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {timePaused ? "Resume" : "Pause"}
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-md border border-white/10 hover:bg-black/70 transition"
          >
            <HelpCircle className="h-3 w-3" />
            Help
          </button>
        </div>
      </div>

      {/* Time-of-day slider (top center, subtle) */}
      <div className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md border border-white/10">
          <Sun className="h-3 w-3 text-amber-300" />
          <Slider
            value={[timeOfDay]}
            min={0}
            max={24}
            step={0.1}
            onValueChange={(v) => setTimeOfDay(v[0])}
            className="w-40 md:w-56"
          />
          <Moon className="h-3 w-3 text-blue-300" />
        </div>
      </div>

      {/* Bottom-left: speed + fuel + compass */}
      <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 pointer-events-auto">
        <div className="flex items-end gap-3">
          {/* Speed */}
          <div className="rounded-2xl bg-black/50 px-4 py-3 backdrop-blur-md border border-white/10 min-w-[120px]">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl md:text-4xl font-light text-white tabular-nums">
                {Math.abs(Math.round(speedKmh))}
              </span>
              <span className="text-xs text-white/60">km/h</span>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-white/50">
              {v.name}
            </div>
          </div>

          {/* Compass */}
          <div className="rounded-2xl bg-black/50 px-4 py-3 backdrop-blur-md border border-white/10 text-center">
            <div className="text-2xl font-light text-white">{compassDir}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/50">
              {Math.round(deg)}°
            </div>
          </div>

          {/* Fuel */}
          <div className="rounded-2xl bg-black/50 px-4 py-3 backdrop-blur-md border border-white/10">
            <div className="flex items-center gap-1.5">
              <Fuel className="h-3 w-3 text-white/70" />
              <span className="text-xs text-white/60">Fuel</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span
                className={`text-2xl font-light tabular-nums ${
                  fuel < 20 ? "text-red-400" : "text-white"
                }`}
              >
                {Math.round(fuel)}
              </span>
              <span className="text-xs text-white/50">%</span>
            </div>
            <div className="mt-1 h-1 w-20 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  fuel < 20 ? "bg-red-500" : fuel < 50 ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${fuel}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-right: camera + indicators + lights + wipers */}
      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 pointer-events-auto">
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={cycleCameraMode}
            className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-md border border-white/10 hover:bg-black/70 transition"
          >
            <Camera className="h-3 w-3" />
            {CAMERA_LABELS[cameraMode]}
          </button>
          <div className="flex items-center gap-1.5">
            <IconButton
              active={headlightsOn}
              onClick={toggleHeadlights}
              icon={<Lightbulb className="h-3 w-3" />}
              label="Lights"
            />
            <IconButton
              active={wipersOn}
              onClick={toggleWipers}
              icon={<Wrench className="h-3 w-3" />}
              label="Wipers"
            />
            <IconButton
              active={indicatorsLeft}
              onClick={toggleLeft}
              icon={<ChevronLeft className="h-3 w-3" />}
              label="L"
            />
            <IconButton
              active={indicatorsRight}
              onClick={toggleRight}
              icon={<ChevronRight className="h-3 w-3" />}
              label="R"
            />
          </div>
          {cruiseControl && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200 backdrop-blur-md border border-emerald-400/30">
              <Gauge className="h-3 w-3" />
              Cruise {Math.round(cruiseSpeed * 3.6)} km/h
            </div>
          )}
          {atCamp && (
            <Button
              size="sm"
              onClick={enterCamp}
              className="rounded-full bg-amber-500/30 text-amber-100 border border-amber-400/40 hover:bg-amber-500/40"
            >
              <Tent className="h-3 w-3 mr-1.5" />
              Rest at Camp
            </Button>
          )}
        </div>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div
          className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="max-w-md w-full rounded-2xl bg-zinc-900 border border-white/10 p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Controls</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="rounded-full p-1 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5 text-sm">
              <ControlRow keys="W / ↑" desc="Accelerate" />
              <ControlRow keys="S / ↓" desc="Brake / Reverse" />
              <ControlRow keys="A / ←" desc="Turn left" />
              <ControlRow keys="D / →" desc="Turn right" />
              <ControlRow keys="Space" desc="Brake" />
              <ControlRow keys="Shift" desc="Handbrake (drift)" />
              <ControlRow keys="C" desc="Cycle camera" />
              <ControlRow keys="L" desc="Toggle headlights" />
              <ControlRow keys="V" desc="Toggle wipers" />
              <ControlRow keys="Q / E" desc="Left / right indicators" />
              <ControlRow keys="R" desc="Cruise control" />
              <ControlRow keys="P" desc="Pause time of day" />
              <ControlRow keys="B" desc="Cycle weather" />
              <ControlRow keys="T" desc="Rest at campsite" />
              <ControlRow keys="X" desc="Reset position" />
            </div>
            <p className="mt-5 text-xs text-white/50 italic">
              Drive without a destination. The journey is the destination.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function IconButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs backdrop-blur-md border transition ${
        active
          ? "bg-emerald-500/30 text-emerald-100 border-emerald-400/40"
          : "bg-black/50 text-white/70 border-white/10 hover:bg-black/70"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ControlRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-white/5">
      <kbd className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded text-white/80">
        {keys}
      </kbd>
      <span className="text-white/70 text-sm">{desc}</span>
    </div>
  );
}
