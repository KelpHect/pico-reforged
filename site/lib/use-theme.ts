"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_STATE, readState, type ThemeState } from "./theme";

let cache: ThemeState | null = null;

function getSnapshot(): ThemeState {
  const next = readState();
  if (cache && cache.theme === next.theme && cache.scheme === next.scheme) return cache;
  cache = next;
  return cache;
}

function subscribe(onChange: () => void) {
  window.addEventListener("pico-site-theme", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("pico-site-theme", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useThemeState(): ThemeState {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_STATE);
}
