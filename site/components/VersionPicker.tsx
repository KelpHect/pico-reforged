"use client";

import { useId, useState } from "react";
import { CopyButton } from "./CopyButton";
import { DEFAULT_THEME, THEMES } from "../lib/themes";

const BASE = "https://cdn.jsdelivr.net/npm/@rusticstack/pico-reforged@1/css/";

const BUILDS = [
  { value: "pico", label: "Class (default)" },
  { value: "pico.classless", label: "Class-less" },
  { value: "pico.conditional", label: "Conditional (.pico)" },
  { value: "pico.classless.conditional", label: "Class-less, conditional" },
  { value: "pico.fluid.classless", label: "Fluid class-less" },
  { value: "pico.fluid.classless.conditional", label: "Fluid class-less, conditional" },
];

/** Builds the CDN link for one of the 238 files from the naming rules on this page. */
export function VersionPicker() {
  const id = useId();
  const [build, setBuild] = useState("pico");
  const [theme, setTheme] = useState<string>(DEFAULT_THEME);
  const [min, setMin] = useState(true);

  const themePart = theme === DEFAULT_THEME ? "" : `.${theme}`;
  // Upstream never published an azure file for the two scoped class-less builds
  const missing = !themePart && build.includes("classless") && build.endsWith(".conditional");
  const tag = `<link rel="stylesheet" href="${BASE}${build}${themePart}${min ? ".min" : ""}.css" />`;

  return (
    <div className="version-picker">
      <div className="grid">
        <label>
          Build
          <select value={build} onChange={(event) => setBuild(event.target.value)}>
            {BUILDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Theme
          <select value={theme} onChange={(event) => setTheme(event.target.value)}>
            {THEMES.map((option) => (
              <option key={option.name} value={option.name}>
                {option.name === DEFAULT_THEME ? `${option.name} (default)` : option.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <input type="checkbox" role="switch" checked={min} onChange={(event) => setMin(event.target.checked)} />
        Minified
      </label>
      {missing ? (
        <p className="version-picker-note" role="status">
          No azure file for this build. Pick a theme, or build it with the CLI.
        </p>
      ) : (
        <div className="version-picker-out">
          <code id={`${id}-out`} aria-live="polite">
            {tag}
          </code>
          <CopyButton text={tag} label="Copy link tag" />
        </div>
      )}
    </div>
  );
}
