"use client";

import { useEffect, useState } from "react";
import { THEMES } from "../lib/themes";
import { writeState, type Scheme } from "../lib/theme";
import { useThemeState } from "../lib/use-theme";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

const SCHEMES: { value: Scheme; label: string; Icon: typeof SunIcon }[] = [
  { value: "auto", label: "Auto", Icon: MonitorIcon },
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
];

/** The 20 theme swatches. Used in the theme panel and on the home page. */
export function ThemeSwatches({ label = "Primary color", className = "swatches" }: { label?: string; className?: string }) {
  const state = useThemeState();
  return (
    <div className={className} role="group" aria-label={label}>
      {THEMES.map((theme) => (
        <button
          key={theme.name}
          type="button"
          className="swatch"
          title={theme.name}
          aria-label={theme.name}
          aria-pressed={state.theme === theme.name}
          style={{ backgroundColor: theme.swatch }}
          onClick={() => writeState({ ...state, theme: theme.name })}
        />
      ))}
    </div>
  );
}

export function ThemeMenu() {
  const state = useThemeState();
  // The server render has no stored state, so the icon settles after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = SCHEMES.find((scheme) => scheme.value === (mounted ? state.scheme : "auto")) ?? SCHEMES[0];

  return (
    <>
      <button type="button" className="icon-button" popoverTarget="theme-panel" aria-label="Theme" title="Theme">
        <current.Icon size={17} />
      </button>
      <div id="theme-panel" popover="auto" className="theme-panel">
        <p className="theme-panel-label" id="scheme-label">
          Color scheme
        </p>
        <div className="segmented" role="radiogroup" aria-labelledby="scheme-label">
          {SCHEMES.map(({ value, label, Icon }) => (
            <label key={value}>
              <input
                type="radio"
                name="site-scheme"
                value={value}
                checked={state.scheme === value}
                onChange={() => writeState({ ...state, scheme: value })}
              />
              <Icon size={14} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p className="theme-panel-label">Primary color</p>
        <ThemeSwatches />
        <p className="theme-name">
          Theme: <strong>{mounted ? state.theme : "azure"}</strong>
        </p>
      </div>
    </>
  );
}
