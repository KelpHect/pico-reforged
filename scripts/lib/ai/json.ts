// JSON the way the formatter writes it: objects always expanded, arrays that hold only primitives
// on one line when they fit in the print width. Keeps `pnpm fmt` from rewriting generated files.
const WIDTH = 100;

// `taken` is what already sits on the line before the value: the indent, the key and the comma
// that follows the value.
export function stringify(value: unknown, indent = "", taken = indent.length): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const flat = value.every((v) => v === null || typeof v !== "object");
    if (flat) {
      const line = `[${value.map((v) => JSON.stringify(v)).join(", ")}]`;
      if (taken + line.length + 1 <= WIDTH) return line;
    }
    const inner = `${indent}  `;
    return `[\n${value.map((v) => inner + stringify(v, inner)).join(",\n")}\n${indent}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    const inner = `${indent}  `;
    const body = entries.map(([k, v]) => {
      const key = `${JSON.stringify(k)}: `;
      return `${inner}${key}${stringify(v, inner, inner.length + key.length)}`;
    });
    return `{\n${body.join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}
