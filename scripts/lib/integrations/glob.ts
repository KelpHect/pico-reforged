import { relative, sep } from "node:path";

/** Forward slashes, so one set of patterns works on every platform. */
export const toPosix = (path: string): string => path.split(sep).join("/").replaceAll("\\", "/");

/** `{a,b}` expansion with nesting. Text without braces comes back as the only entry. */
export function expandBraces(pattern: string): string[] {
  let depth = 0;
  let open = -1;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i] as string;
    if (ch === "\\") i++;
    else if (ch === "{") {
      if (depth === 0) open = i;
      depth++;
    } else if (ch === "}" && depth > 0) {
      depth--;
      if (depth === 0) {
        const inner = pattern.slice(open + 1, i);
        const options: string[] = [];
        let level = 0;
        let from = 0;
        for (let k = 0; k < inner.length; k++) {
          const c = inner[k] as string;
          if (c === "{") level++;
          else if (c === "}") level--;
          else if (c === "," && level === 0) {
            options.push(inner.slice(from, k));
            from = k + 1;
          }
        }
        options.push(inner.slice(from));
        // A brace group with one entry (no comma) is literal text, as in shells.
        if (options.length === 1)
          return expandBraces(pattern.slice(i + 1)).map(
            (rest) => `${pattern.slice(0, i + 1)}${rest}`,
          );
        const head = pattern.slice(0, open);
        const tail = pattern.slice(i + 1);
        return options.flatMap((option) => expandBraces(`${head}${option}${tail}`));
      }
    }
  }
  return [pattern];
}

const escapeChar = (ch: string): string => ch.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&");

/**
 * One glob (no braces) to a RegExp over a posix path without a leading slash.
 * `**` crosses folders, `*` and `?` do not, `[a-z]` and `[!a-z]` are classes.
 */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i] as string;
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        let j = i + 2;
        while (glob[j] === "*") j++;
        if (glob[j] === "/") {
          re += "(?:.*/)?";
          i = j + 1;
        } else {
          re += ".*";
          i = j;
        }
      } else {
        re += "[^/]*";
        i++;
      }
    } else if (ch === "?") {
      re += "[^/]";
      i++;
    } else if (ch === "[") {
      const close = glob.indexOf("]", i + 2);
      if (close === -1) {
        re += String.raw`\[`;
        i++;
      } else {
        let body = glob.slice(i + 1, close);
        if (body.startsWith("!")) body = `^${body.slice(1)}`;
        re += `[${body.replaceAll("\\", "\\\\")}]`;
        i = close + 1;
      }
    } else if (ch === "\\" && i + 1 < glob.length) {
      re += escapeChar(glob[i + 1] as string);
      i += 2;
    } else {
      re += escapeChar(ch);
      i++;
    }
  }
  return new RegExp(`^${re}$`);
}

/** True when the text has glob syntax. */
export const hasMagic = (text: string): boolean => /[*?[{]/.test(text);

/** Matcher for a list of globs (braces allowed) against a posix path relative to some base. */
export function matcher(globs: string[]): (path: string) => boolean {
  const list = globs
    .flatMap((g) => expandBraces(g))
    .map((g) => globToRegExp(g.replace(/^\.\//, "")));
  return (path) => list.some((re) => re.test(path));
}

/**
 * Splits a glob at its first magic segment: "src/**\/*.html" gives base "src" and pattern
 * "**\/*.html". A path without magic gives the whole path as base and an empty pattern.
 */
export function splitGlob(glob: string): { base: string; pattern: string } {
  const parts = toPosix(glob).split("/");
  const at = parts.findIndex((part) => hasMagic(part));
  if (at === -1) return { base: parts.join("/"), pattern: "" };
  return { base: parts.slice(0, at).join("/"), pattern: parts.slice(at).join("/") };
}

export const relPosix = (from: string, to: string): string => toPosix(relative(from, to));

/* gitignore */

export type IgnoreRule = { re: RegExp; negate: boolean; dirOnly: boolean };

/** Parses the text of a .gitignore file. Paths are matched relative to the file's folder. */
export function parseGitignore(text: string): IgnoreRule[] {
  const rules: IgnoreRule[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.replace(/(?<!\\)\s+$/, "");
    if (!line || line.startsWith("#")) continue;
    let negate = false;
    if (line.startsWith("!")) {
      negate = true;
      line = line.slice(1);
    } else if (line.startsWith(String.raw`\!`) || line.startsWith(String.raw`\#`)) {
      line = line.slice(1);
    }
    let dirOnly = false;
    if (line.endsWith("/")) {
      dirOnly = true;
      line = line.replace(/\/+$/, "");
    }
    if (!line) continue;
    const anchored = line.includes("/");
    line = line.replace(/^\//, "");
    const body = globToRegExp(line).source.slice(1, -1);
    // An unanchored pattern matches at any depth; an anchored one only from the file's folder.
    const re = new RegExp(anchored ? `^${body}$` : `^(?:.*/)?${body}$`);
    rules.push({ re, negate, dirOnly });
  }
  return rules;
}

/** The verdict of one rule list for a path: true ignored, false re-included, undefined no match. */
export function matchRules(rules: IgnoreRule[], rel: string, isDir: boolean): boolean | undefined {
  let verdict: boolean | undefined;
  for (const rule of rules) {
    if (rule.dirOnly && !isDir) continue;
    if (rule.re.test(rel)) verdict = !rule.negate;
  }
  return verdict;
}
