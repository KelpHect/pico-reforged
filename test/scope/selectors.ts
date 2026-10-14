// Usage: node test/scope/selectors.ts [new.css] [ref.css]
// Parses both stylesheets with Lightning CSS (so formatting is normalised), flattens every style
// rule to "context | selector" entries and diffs the two sets. Only the selector set is compared,
// not the declarations.
import { transform } from "lightningcss";
import { readFileSync } from "node:fs";

function norm(path: string): string {
  const r = transform({ filename: path, code: readFileSync(path), minify: false });
  return new TextDecoder().decode(r.code);
}

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if ("([{".includes(ch)) depth++;
    if (")]}".includes(ch)) depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function entries(css: string): Set<string> {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const stack: string[] = [];
  const out = new Set<string>();
  let buf = "";
  let inDecl = 0;
  for (const ch of text) {
    if (ch === "{") {
      const head = buf.trim().replace(/\s+/g, " ");
      buf = "";
      if (
        head.startsWith("@media") ||
        head.startsWith("@supports") ||
        head.startsWith("@layer") ||
        head.startsWith("@container")
      ) {
        stack.push(head);
      } else if (head.startsWith("@")) {
        stack.push(head);
        inDecl++;
      } else if (inDecl) {
        stack.push(head);
      } else {
        for (const s of splitTop(head))
          out.add(`${stack.filter((x) => !x.startsWith("@layer")).join(" > ")} | ${s}`);
        stack.push(head);
        inDecl++;
      }
    } else if (ch === "}") {
      stack.pop();
      if (inDecl) inDecl--;
      buf = "";
    } else if (ch === ";") buf = "";
    else buf += ch;
  }
  return out;
}

if (process.argv[1]?.endsWith("selectors.ts") && !process.argv.includes("--scope")) {
  const [a = "css/pico.conditional.css", b = "test/reference/v2.1.1/pico.conditional.css"] =
    process.argv.slice(2);
  const n = entries(norm(a));
  const r = entries(norm(b));
  const onlyNew = [...n].filter((x) => !r.has(x));
  const onlyRef = [...r].filter((x) => !n.has(x));
  console.log(`new ${n.size} selectors, ref ${r.size}`);
  console.log(`only in new (${onlyNew.length}):\n${onlyNew.join("\n")}`);
  console.log(`only in ref (${onlyRef.length}):\n${onlyRef.join("\n")}`);
}

/** Selectors a scoped build left outside the scope, relative to its unscoped sibling. */
export function scopeReport(scopedPath: string, plainPath: string, scope = ".pico") {
  const scoped = entries(norm(scopedPath));
  const plain = entries(norm(plainPath));
  const strip = (e: string): string => e.split(`${scope} `).join("").split(scope).join("");
  const unscoped: string[] = [];
  const unmatched: string[] = [];
  for (const e of scoped) {
    if (!e.includes(scope)) unscoped.push(e);
    if (!plain.has(strip(e))) unmatched.push(e);
  }
  const stripped = new Set([...scoped].map(strip));
  const missing = [...plain].filter((p) => !stripped.has(p));
  return { unscoped, unmatched, missing };
}

if (process.argv[1]?.endsWith("selectors.ts") && process.argv.includes("--scope")) {
  const [sNew, pNew, sRef, pRef] = [
    "css/pico.conditional.css",
    "css/pico.css",
    "test/reference/v2.1.1/pico.conditional.css",
    "test/reference/v2.1.1/pico.css",
  ];
  const n = scopeReport(sNew, pNew);
  const r = scopeReport(sRef, pRef);
  const key = (x: string) => x.replace(/^.*\| /, "");
  const nu = new Set(n.unscoped.map(key));
  const ru = new Set(r.unscoped.map(key));
  console.log(
    `new: ${n.unscoped.length} unscoped, ${n.unmatched.length} scoped w/o plain twin, ${n.missing.length} plain w/o scoped twin`,
  );
  console.log(
    `ref: ${r.unscoped.length} unscoped, ${r.unmatched.length} scoped w/o plain twin, ${r.missing.length} plain w/o scoped twin`,
  );
  console.log("--- unscoped only in new");
  for (const k of nu) if (!ru.has(k)) console.log(k);
  console.log("--- unscoped only in ref");
  for (const k of ru) if (!nu.has(k)) console.log(k);
  console.log("--- new: scoped w/o plain twin");
  n.unmatched.forEach((x) => console.log(x));
  console.log("--- new: plain w/o scoped twin");
  n.missing.forEach((x) => console.log(x));
}
