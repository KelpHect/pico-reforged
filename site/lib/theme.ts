export type Scheme = "auto" | "light" | "dark";
export type ThemeState = { theme: string; scheme: Scheme };

export const STORAGE_KEY = "pico-reforged-site";
export const DEFAULT_STATE: ThemeState = { theme: "azure", scheme: "auto" };

export function readState(): ThemeState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeState>;
      return {
        theme: typeof parsed.theme === "string" ? parsed.theme : DEFAULT_STATE.theme,
        scheme:
          parsed.scheme === "light" || parsed.scheme === "dark" ? parsed.scheme : "auto",
      };
    }
  } catch {
    // storage can be blocked, the default state is fine
  }
  return DEFAULT_STATE;
}

export function applyState(state: ThemeState) {
  const root = document.documentElement;
  if (state.theme === "azure") root.removeAttribute("data-pico-theme");
  else root.setAttribute("data-pico-theme", state.theme);
  if (state.scheme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", state.scheme);
}

export function writeState(state: ThemeState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  applyState(state);
  window.dispatchEvent(new CustomEvent("pico-site-theme", { detail: state }));
}

/** Runs in <head> before paint so the page does not flash the wrong theme. */
export const THEME_INIT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)})||"null");if(!s)return;var r=document.documentElement;if(s.theme&&s.theme!=="azure")r.setAttribute("data-pico-theme",s.theme);if(s.scheme==="light"||s.scheme==="dark")r.setAttribute("data-theme",s.scheme)}catch(e){}})()`;
