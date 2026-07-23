// Keyboard input hook. Tracks pressed keys and exposes a snapshot via
// a ref so the animation loop can read inputs without causing React
// re-renders every frame.
//
// Also handles "action" keys (lights, wipers, indicators, camera, pause,
// time scale) that should fire once per press — those go through the
// callback param.

import { useEffect, useRef } from "react";

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  handbrake: boolean;
  reset: boolean;
}

export interface ActionCallbacks {
  onToggleCamera?: () => void;
  onToggleHeadlights?: () => void;
  onToggleWipers?: () => void;
  onToggleLeftIndicator?: () => void;
  onToggleRightIndicator?: () => void;
  onToggleCruise?: () => void;
  onTogglePause?: () => void;
  onCycleWeather?: () => void;
  onEnterCamp?: () => void;
}

const ACTION_KEYS = new Set([
  "KeyC",
  "KeyL",
  "KeyV",
  "KeyQ",
  "KeyE",
  "KeyR",
  "KeyP",
  "KeyB",
  "KeyT",
]);

export function useKeyboard(callbacks: ActionCallbacks) {
  const input = useRef<InputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    handbrake: false,
    reset: false,
  });

  // Keep callbacks in a ref so we don't rebind listeners on every render.
  const cbRef = useRef(callbacks);
  useEffect(() => {
    cbRef.current = callbacks;
  });

  // Track which action keys have been "consumed" so holding doesn't repeat.
  const consumed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const isTarget = (e: KeyboardEvent) => {
      // Ignore when typing in form fields.
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return false;
      }
      return true;
    };

    const down = (e: KeyboardEvent) => {
      if (!isTarget(e)) return;
      const code = e.code;

      switch (code) {
        case "KeyW":
        case "ArrowUp":
          input.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          input.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          input.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          input.current.right = true;
          break;
        case "Space":
          input.current.brake = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          input.current.handbrake = true;
          break;
        case "KeyX":
          input.current.reset = true;
          break;
      }

      if (ACTION_KEYS.has(code) && !consumed.current.has(code)) {
        consumed.current.add(code);
        switch (code) {
          case "KeyC":
            cbRef.current.onToggleCamera?.();
            break;
          case "KeyL":
            cbRef.current.onToggleHeadlights?.();
            break;
          case "KeyV":
            cbRef.current.onToggleWipers?.();
            break;
          case "KeyQ":
            cbRef.current.onToggleLeftIndicator?.();
            break;
          case "KeyE":
            cbRef.current.onToggleRightIndicator?.();
            break;
          case "KeyR":
            cbRef.current.onToggleCruise?.();
            break;
          case "KeyP":
            cbRef.current.onTogglePause?.();
            break;
          case "KeyB":
            cbRef.current.onCycleWeather?.();
            break;
          case "KeyT":
            cbRef.current.onEnterCamp?.();
            break;
        }
      }
    };

    const up = (e: KeyboardEvent) => {
      const code = e.code;
      consumed.current.delete(code);
      switch (code) {
        case "KeyW":
        case "ArrowUp":
          input.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          input.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          input.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          input.current.right = false;
          break;
        case "Space":
          input.current.brake = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          input.current.handbrake = false;
          break;
        case "KeyX":
          input.current.reset = false;
          break;
      }
    };

    const blur = () => {
      input.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        brake: false,
        handbrake: false,
        reset: false,
      };
      consumed.current.clear();
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return input;
}
