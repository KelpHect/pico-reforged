"use client";

import { useRef } from "react";
import { THEMES } from "../lib/themes";
import { writeState, type Scheme } from "../lib/theme";
import { useThemeState } from "../lib/use-theme";

const SCHEMES: { value: Scheme; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeMenu() {
  const state = useThemeState();
  const menu = useRef<HTMLDetailsElement>(null);

  return (
    <details className="dropdown theme-menu" ref={menu}>
      <summary aria-label="Theme and color scheme">Theme</summary>
      <ul className="theme-panel">
        <li>
          <fieldset role="group" aria-label="Color scheme" className="scheme-group">
            {SCHEMES.map((scheme) => (
              <button
                key={scheme.value}
                type="button"
                className={state.scheme === scheme.value ? "" : "secondary outline"}
                aria-pressed={state.scheme === scheme.value}
                onClick={() => writeState({ ...state, scheme: scheme.value })}
              >
                {scheme.label}
              </button>
            ))}
          </fieldset>
        </li>
        <li>
          <div className="swatches" role="group" aria-label="Primary color">
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
        </li>
      </ul>
    </details>
  );
}
