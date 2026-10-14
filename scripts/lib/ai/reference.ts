// Turns the component manifest into the per-component reference files of the agent skill, so the
// long material in skills/pico-reforged/references/ never drifts from the CSS.

type Trigger = { name: string; trigger: string; description: string };
export type Component = {
  name: string;
  category: string;
  optIn: Record<string, string>;
  summary: string;
  use: string;
  examples: { label: string; html: string }[];
  variants: Trigger[];
  states: Trigger[];
  aria: string[];
  notes?: string[];
  tokens: { reads: string[]; defines: string[] };
  js: { description: string; code: string } | null;
};

const code = (text: string): string => `\`${text}\``;

function optIn(c: Component): string {
  const o = c.optIn;
  if (o.kind === "extra") {
    return `Opt in. Load ${code(o.cdn as string)} (or ${code(o.allExtrasCdn as string)} for every extra), import ${code(o.import as string)}, or write ${code(o.config as string)} in the stylesheet. CLI: ${code(o.cli as string)}.`;
  }
  if (o.kind === "option") return `Off by default. ${o.how as string}`;
  return `Part of the core build. Leave it out with the module name ${code(o.module as string)} in ${code("exclude")}.`;
}

function section(c: Component): string {
  const out = [`## ${c.name}`, "", `${c.summary}.`, "", c.use, "", optIn(c), ""];
  for (const example of c.examples) {
    out.push(`${example.label}:`, "", "```html", example.html, "```", "");
  }
  const list = (title: string, items: Trigger[]): void => {
    if (items.length === 0) return;
    out.push(`${title}:`, "");
    for (const t of items) out.push(`- ${code(t.trigger)}: ${t.description}`);
    out.push("");
  };
  list("Variants", c.variants);
  list("States", c.states);
  if (c.aria.length > 0) out.push("Accessibility:", "", ...c.aria.map((a) => `- ${a}`), "");
  if (c.notes) out.push(...c.notes.map((n) => `- ${n}`), "");
  if (c.js) out.push(c.js.description, "", "```js", c.js.code, "```", "");
  if (c.tokens.defines.length > 0) {
    out.push(`Sets on its own elements: ${c.tokens.defines.map(code).join(", ")}.`, "");
  }
  if (c.tokens.reads.length > 0) {
    out.push(`Reads: ${c.tokens.reads.map(code).join(", ")}.`, "");
  }
  return out.join("\n");
}

const INTRO = {
  components: [
    "# Core components",
    "",
    "Generated from `ai/components.json`, do not edit by hand. Every module here is in the default build unless the entry says it is off. For the opt-in extras see [extras.md](extras.md).",
    "",
  ],
  extras: [
    "# Extras",
    "",
    "Generated from `ai/components.json`, do not edit by hand. Extras are opt-in and load after the core build, in the `pico.extras` layer. For the core components see [components.md](components.md).",
    "",
  ],
};

export function generateReferences(components: Component[]): Record<string, string> {
  const core = components.filter((c) => c.category !== "extras");
  const extras = components.filter((c) => c.category === "extras");
  return {
    "skills/pico-reforged/references/components.md": [
      ...INTRO.components,
      ...core.map(section),
    ].join("\n"),
    "skills/pico-reforged/references/extras.md": [...INTRO.extras, ...extras.map(section)].join(
      "\n",
    ),
  };
}
