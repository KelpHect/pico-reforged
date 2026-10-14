import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import type { Dirent } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { ANY, emptyIndex, mergeIndex, scanText } from "../compiler/purge.ts";
import type { ContentIndex } from "../compiler/purge.ts";
import { hasMagic, matcher, matchRules, parseGitignore, splitGlob, toPosix } from "./glob.ts";
import type { IgnoreRule } from "./glob.ts";

/** Folders that are never scanned, at any depth: dependencies, VCS data and tool caches. */
export const IGNORED_DIRS = [
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".astro",
  ".svelte-kit",
  ".nuxt",
  ".output",
  ".turbo",
  ".vercel",
  ".netlify",
  ".cache",
  ".parcel-cache",
  ".vite",
  ".angular",
  ".docusaurus",
  ".expo",
  "__pycache__",
  ".venv",
];

/**
 * Build output folders by their usual names. They are skipped in the folder the scan starts
 * from only: a nested src/app/build or src/features/target is source code. A nested one that is
 * real output is a .gitignore entry, or is found by its marker files (see OUTPUT_MARKERS).
 */
export const ROOT_IGNORED_DIRS = ["dist", "build", "out", "coverage", "venv", "target"];

/** Files a build tool writes into its output folder and nothing else does. */
const OUTPUT_MARKERS = new Set(["BUILD_ID", "build-manifest.json", "routes-manifest.json"]);

const LOCK_FILES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "deno.lock",
  "composer.lock",
  "gemfile.lock",
  "cargo.lock",
  "poetry.lock",
  "pipfile.lock",
  "uv.lock",
  "go.sum",
  "mix.lock",
  "flake.lock",
]);

const split = (list: string): Set<string> => new Set(list.split(/\s+/).filter(Boolean));

/** Style sheets are the output of the integration, never its input. */
const STYLE_EXTENSIONS = split("css scss sass less styl stylus pcss postcss");

const BINARY_EXTENSIONS = split(
  `png jpg jpeg gif webp avif ico icns bmp tif tiff heic heif psd ai eps raw
   svg woff woff2 ttf otf eot
   mp3 mp4 m4a m4v webm ogg ogv oga wav flac aac mov avi mkv
   zip gz tgz tar rar 7z br zst bz2 xz
   pdf doc docx xls xlsx ppt pptx odt ods
   exe dll so dylib wasm bin node o a obj class jar pyc
   sqlite sqlite3 db map lockb DS_Store`,
);

/** Extensions of files that hold markup or scripts. A scan that finds none of them found no source. */
export const SOURCE_EXTENSIONS = split(
  `html htm xhtml js jsx mjs cjs ts tsx mts cts vue svelte astro md mdx markdown mdoc php phtml erb ejs
   hbs handlebars mustache njk liquid twig jinja jinja2 j2 pug haml slim templ cshtml razor gohtml tmpl
   py rb go rs java kt cs swift dart ex exs heex leex hx`,
);

/** Extensions whose files are rendered into HTML at build or run time (prose tags appear). */
const MARKUP_EXTENSIONS = split("md mdx markdown mdoc rst adoc asciidoc");

/**
 * Tags a Markdown renderer, a CMS or a rich text field puts on the page without the tag ever
 * being written in the project sources. Added to the content when the scan finds such a source.
 */
export const PROSE_TAGS = split(
  `p a ul ol li dl dt dd strong em b i u s small mark del ins sub sup abbr cite q kbd samp var
   code pre blockquote hr br img picture source video audio iframe figure figcaption
   input table caption thead tbody tfoot tr th td colgroup col details summary h1 h2 h3 h4 h5 h6
   section article aside header footer nav main div span time address
   form fieldset legend label select option optgroup datalist textarea button output progress meter
   dialog hgroup menu search template slot`,
);

/** Attributes that fragments fetched at run time set or carry, which the sources never show. */
const FRAGMENT_ATTRS = [
  "aria-busy",
  "aria-invalid",
  "aria-expanded",
  "aria-label",
  "role",
  "type",
  "disabled",
  "checked",
  "required",
  "readonly",
];

/**
 * Code that writes HTML from a string, or fetches server-rendered fragments, so the tags it
 * holds are not in the sources. Covers innerHTML and friends, unescaped output in template
 * languages (Handlebars, Django, Rails, Hugo, Go, Razor, Thymeleaf), and fragment libraries
 * (htmx, Turbo, Unpoly, Livewire, LiveView, Datastar).
 */
const DYNAMIC_HTML =
  /\{\{\{|\bhx-(?:get|post|put|patch|delete|swap|boost|trigger|target)\b|\bdata-hx-|\bturbo-(?:frame|stream)\b|\bdata-turbo|\bup-(?:target|follow|layer)\b|\bwire:|\blivewire\b|\bphx-|\bdata-on-|\bdata-star|\bmark_safe\b|autoescape\s+off|\.html_safe\b|\braw\s*\(|<%==|<%=\s*raw\b|\bsafeHTML\b|\btemplate\.HTML\b|\bHtml\.Raw\b|\bth:utext\b|dangerouslySetInnerHTML|\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|createContextualFragment|\bDOMParser\b|\bv-html\b|\{@html\b|\bset:html\b|\{!!|<%-|\|\s*safe\b|\|\s*raw\b|\|\s*unsafe\b|markdown|rich-?text|portable-?text|blocks-?renderer|\bmarked\b|showdown|remark|rehype|micromark|markdownit|wysiwyg|prosemirror|tiptap|\bquill\b|html-react-parser|html-to-react|documentToHtml|\bsanitize\b|simple_format|content_tag|link_to|image_tag|button_to/i;

/**
 * Tags that a framework writes for components the sources only name: next/link and RouterLink
 * give a, next/image and NuxtImg give img, a run-time heading level gives h1 to h6. They are
 * part of every source scan.
 */
const COMPONENT_TAGS = ["a", "img", "h1", "h2", "h3", "h4", "h5", "h6"];

export const DEFAULT_MAX_FILE_SIZE = 1024 * 1024;
/** The limit for a file named by an `@source` rule. */
export const EXPLICIT_MAX_FILE_SIZE = 32 * 1024 * 1024;

export type ResolvedSource = {
  /** Absolute folder or file the rule starts at. */
  base: string;
  /** Glob under base, "" when base itself is the path. */
  pattern: string;
  not: boolean;
};

export type ScanOptions = {
  /** Folder the automatic scan walks. Undefined turns the automatic scan off. */
  root?: string;
  sources?: ResolvedSource[];
  /** Folder names or absolute paths that are never scanned, on top of IGNORED_DIRS. */
  ignore?: string[];
  /** Use the default folder names only when true. For built output, where "out" is a page. */
  onlyCoreIgnores?: boolean;
  /** Read .gitignore files. Default true. */
  gitignore?: boolean;
  maxFileSize?: number;
};

export type ScanResult = {
  index: ContentIndex;
  /** Every file that was read, absolute paths with forward slashes. */
  files: string[];
  /** Folders that hold scanned files (the watch list for new files). */
  dirs: string[];
  /** Why the content has the prose tag set, when it does. */
  dynamicHtml: string[];
  /** Files left out because they are over the size limit. */
  skipped: string[];
};

/** Absolute, forward slashes, and an upper case drive letter so equal paths compare equal. */
const norm = (path: string): string => {
  const posix = toPosix(resolve(path));
  return /^[a-z]:/.test(posix) ? (posix[0] as string).toUpperCase() + posix.slice(1) : posix;
};

/** True when `rel` (from path.relative) points outside the folder it is relative to. */
const outside = (rel: string): boolean => rel === ".." || rel.startsWith("../") || isAbsolute(rel);

type IgnoreFile = { dir: string; rules: IgnoreRule[] };

type FileEntry = {
  mtimeMs: number;
  size: number;
  index: ContentIndex;
  dynamic: boolean;
  /** Code that writes or fetches HTML, as opposed to a Markdown source. */
  fragments: boolean;
};

function isBinaryBuffer(buffer: Buffer): boolean {
  const end = Math.min(buffer.length, 8000);
  for (let i = 0; i < end; i++) if (buffer[i] === 0) return true;
  return false;
}

/** The nearest folder at or above `dir` that holds `.git`, or undefined. */
function findGitRoot(dir: string): string | undefined {
  let current = resolve(dir);
  for (;;) {
    if (existsSync(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function readIgnoreFile(dir: string): IgnoreFile | undefined {
  const file = join(dir, ".gitignore");
  try {
    return { dir: norm(dir), rules: parseGitignore(readFileSync(file, "utf8")) };
  } catch {
    return undefined;
  }
}

/** True for a file the automatic scan leaves out by name. */
export function isIgnoredFile(name: string): boolean {
  const lower = name.toLowerCase();
  if (LOCK_FILES.has(lower) || lower.endsWith(".lock") || lower.endsWith(".lockb")) return true;
  const ext = extname(lower).slice(1);
  return STYLE_EXTENSIONS.has(ext) || BINARY_EXTENSIONS.has(ext);
}

/** True for a file that cannot hold markup or scripts by its extension. */
function isBinaryName(name: string): boolean {
  return BINARY_EXTENSIONS.has(extname(name).slice(1).toLowerCase());
}

/**
 * Scans a project for the names its markup and scripts use. The scanner keeps one parsed entry
 * per file (size and mtime decide when it is read again) and builds a fresh index on every
 * scan, so a name that leaves the sources also leaves the index.
 */
export class Scanner {
  private readonly cache = new Map<string, FileEntry>();
  options: ScanOptions;

  constructor(options: ScanOptions) {
    this.options = options;
  }

  scan(): ScanResult {
    const { options } = this;
    const maxSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
    const sources = options.sources ?? [];
    const excluded = sources.filter((s) => s.not);
    const included = sources.filter((s) => !s.not);
    const coreOnly = options.onlyCoreIgnores === true;
    const ignoredNames = new Set(coreOnly ? ["node_modules", ".git"] : IGNORED_DIRS);
    const rootOnlyNames = new Set(coreOnly ? [] : ROOT_IGNORED_DIRS);
    // an explicit @source may hold a file as big as a data export
    const explicitMax = Math.max(maxSize, EXPLICIT_MAX_FILE_SIZE);
    const skipped: string[] = [];
    const skippedAuto: string[] = [];
    const linked = new Set<string>();
    const ignoredPaths = new Set<string>();
    for (const entry of options.ignore ?? []) {
      if (/[\\/]/.test(entry) || /^[A-Za-z]:/.test(entry)) ignoredPaths.add(norm(entry));
      else ignoredNames.add(entry);
    }
    const useGitignore = options.gitignore !== false;
    // dist-full, build-old, out.prod: another output folder next to dist
    const siblingOutput = (name: string): boolean =>
      !coreOnly && [...rootOnlyNames].some((base) => new RegExp(`^${base}[-_.]`).test(name));

    const found = new Map<string, FileEntry>();
    const visited = new Set<string>();

    const excludeTests = excluded.map((rule) => ({
      rule,
      test: rule.pattern === "" ? undefined : matcher([rule.pattern]),
    }));
    const excludedBy = (path: string): boolean =>
      excludeTests.some(({ rule, test }) => {
        const rel = toPosix(relative(rule.base, path));
        if (outside(rel)) return false;
        if (!test) return true;
        // a glob can name a folder, in which case everything under it goes too
        const parts = rel.split("/");
        for (let i = 1; i <= parts.length; i++) if (test(parts.slice(0, i).join("/"))) return true;
        return false;
      });

    // A linked folder is walked once, and never again through a link that loops back.
    const enterLink = (path: string): boolean => {
      try {
        const real = realpathSync(path);
        if (linked.has(real)) return false;
        linked.add(real);
        return true;
      } catch {
        return false;
      }
    };

    const take = (file: string, explicit: boolean): void => {
      const path = norm(file);
      // the automatic walk and an explicit @source are separate passes over the same file
      const mark = `${explicit ? "e" : "a"}:${path}`;
      if (found.has(path) || visited.has(mark)) return;
      visited.add(mark);
      const name = basename(path);
      if (!explicit && isIgnoredFile(name)) return;
      if (explicit && isBinaryName(name)) return;
      let stat;
      try {
        stat = statSync(path);
      } catch {
        return;
      }
      if (!stat.isFile() || stat.size === 0) return;
      if (stat.size > (explicit ? explicitMax : maxSize)) {
        skipped.push(path);
        // a big content file may hold any markup, so it counts as a dynamic source
        if (SOURCE_EXTENSIONS.has(extname(name).slice(1).toLowerCase())) skippedAuto.push(path);
        return;
      }
      const cached = this.cache.get(path);
      if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
        found.set(path, cached);
        return;
      }
      let buffer: Buffer;
      try {
        buffer = readFileSync(path);
      } catch {
        return;
      }
      if (isBinaryBuffer(buffer)) return;
      const text = buffer.toString("utf8");
      const index = emptyIndex();
      scanText(index, text);
      const markup = MARKUP_EXTENSIONS.has(extname(name).slice(1).toLowerCase());
      const fragments = !markup && DYNAMIC_HTML.test(text);
      const entry: FileEntry = {
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        index,
        dynamic: markup || fragments,
        fragments,
      };
      this.cache.set(path, entry);
      found.set(path, entry);
    };

    /* automatic scan */
    const walkAuto = (dir: string, stack: IgnoreFile[], depth: number): void => {
      let entries: Dirent[];
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      let local = stack;
      if (useGitignore && entries.some((e) => e.name === ".gitignore" && e.isFile())) {
        const own = readIgnoreFile(dir);
        if (own) local = [...stack, own];
      }
      // a folder a build tool wrote into (a custom distDir) is output, whatever it is called
      if (depth > 0 && entries.some((e) => OUTPUT_MARKERS.has(e.name) && e.isFile())) return;
      entries.sort((a, b) => (a.name < b.name ? -1 : 1));
      for (const entry of entries) {
        const path = norm(join(dir, entry.name));
        let isDir = entry.isDirectory();
        let isFile = entry.isFile();
        if (entry.isSymbolicLink()) {
          try {
            const target = statSync(path);
            isDir = target.isDirectory();
            isFile = target.isFile();
          } catch {
            continue;
          }
        }
        if (isDir) {
          if (ignoredNames.has(entry.name) || ignoredPaths.has(path)) continue;
          if (depth === 0 && (rootOnlyNames.has(entry.name) || siblingOutput(entry.name))) continue;
          if (excludedBy(path)) continue;
          if (gitIgnored(local, path, true)) continue;
          if (entry.isSymbolicLink() && !enterLink(path)) continue;
          walkAuto(path, local, depth + 1);
        } else if (isFile) {
          if (ignoredPaths.has(path) || excludedBy(path)) continue;
          if (gitIgnored(local, path, false)) continue;
          take(path, false);
        }
      }
    };

    /* explicit sources: no .gitignore, no extension rules, folders by name only inside */
    const walkExplicit = (
      dir: string,
      base: string,
      test: ((rel: string) => boolean) | undefined,
      allowed: Set<string>,
    ): void => {
      let entries: Dirent[];
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const path = norm(join(dir, entry.name));
        let isDir = entry.isDirectory();
        let isFile = entry.isFile();
        if (entry.isSymbolicLink()) {
          try {
            const target = statSync(path);
            isDir = target.isDirectory();
            isFile = target.isFile();
          } catch {
            continue;
          }
        }
        if (isDir) {
          if (ignoredNames.has(entry.name) && !allowed.has(entry.name)) continue;
          if (ignoredPaths.has(path) || excludedBy(path)) continue;
          if (entry.isSymbolicLink() && !enterLink(path)) continue;
          walkExplicit(path, base, test, allowed);
        } else if (isFile) {
          if (excludedBy(path)) continue;
          if (test && !test(toPosix(relative(base, path)))) continue;
          take(path, true);
        }
      }
    };

    if (options.root) {
      const root = norm(options.root);
      const gitRoot = useGitignore ? findGitRoot(root) : undefined;
      const stack: IgnoreFile[] = [];
      if (gitRoot) {
        // .gitignore files above the scan folder, from the repository root down
        const chain: string[] = [];
        for (let dir = dirname(resolve(root)); ; dir = dirname(dir)) {
          if (toPosix(relative(gitRoot, dir)).startsWith("..")) break;
          chain.unshift(dir);
          if (resolve(dir) === resolve(gitRoot) || dirname(dir) === dir) break;
        }
        for (const dir of chain) {
          const own = readIgnoreFile(dir);
          if (own) stack.push(own);
        }
      }
      try {
        linked.add(realpathSync(root));
      } catch {
        // a root that cannot be resolved is not walked either
      }
      walkAuto(root, stack, 0);
    }

    for (const source of included) {
      if (source.pattern === "") {
        let stat;
        try {
          stat = statSync(source.base);
        } catch {
          continue;
        }
        if (stat.isDirectory()) walkExplicit(source.base, source.base, undefined, new Set());
        else if (!excludedBy(source.base)) take(source.base, true);
      } else {
        const allowed = new Set(
          toPosix(source.pattern)
            .split("/")
            .filter((part) => !hasMagic(part)),
        );
        const test = matcher([source.pattern]);
        walkExplicit(source.base, source.base, test, allowed);
      }
    }

    const index = emptyIndex();
    const dirs = new Set<string>();
    const reasons: string[] = [];
    let fragments = false;
    for (const [path, entry] of found) {
      if (entry.fragments) fragments = true;
      mergeIndex(index, entry.index);
      dirs.add(dirname(path));
      if (entry.dynamic && reasons.length < 5) reasons.push(path);
    }
    for (const path of skippedAuto) if (reasons.length < 5) reasons.push(path);
    if (reasons.length > 0) {
      for (const tag of PROSE_TAGS) index.tags.add(tag);
      if (fragments) for (const name of FRAGMENT_ATTRS) addAttrValue(index, name, ANY);
      // GFM task lists: <input type="checkbox" disabled>
      addAttrValue(index, "type", "checkbox");
      addAttrValue(index, "disabled", ANY);
      addAttrValue(index, "checked", ANY);
    }
    if (!coreOnly && found.size > 0) for (const tag of COMPONENT_TAGS) index.tags.add(tag);
    // forget files that are gone, so the cache does not grow with deleted files
    for (const path of this.cache.keys()) if (!found.has(path)) this.cache.delete(path);
    index.files = found.size;
    return { index, files: [...found.keys()], dirs: [...dirs], dynamicHtml: reasons, skipped };
  }
}

function addAttrValue(index: ContentIndex, name: string, value: string | typeof ANY): void {
  const have = index.attrs.get(name);
  if (have === ANY) return;
  if (value === ANY) index.attrs.set(name, ANY);
  else if (have) have.add(value);
  else index.attrs.set(name, new Set([value]));
}

function gitIgnored(stack: IgnoreFile[], path: string, isDir: boolean): boolean {
  let verdict = false;
  for (const file of stack) {
    const rel = toPosix(relative(file.dir, path));
    if (outside(rel) || rel === "") continue;
    const v = matchRules(file.rules, rel, isDir);
    if (v !== undefined) verdict = v;
  }
  return verdict;
}

/** Resolves the globs of `@source` rules against a folder (the CSS file's folder). */
export function resolveSources(
  baseDir: string,
  rules: { pattern: string; not: boolean }[],
): ResolvedSource[] {
  return rules.map(({ pattern, not }) => {
    const { base, pattern: glob } = splitGlob(pattern);
    return { base: norm(resolve(baseDir, base || ".")), pattern: glob, not };
  });
}

/** The nearest folder at or above `from` with a package.json. */
export function findProjectRoot(from: string): string | undefined {
  let dir = resolve(from);
  try {
    if (statSync(dir).isFile()) dir = dirname(dir);
  } catch {
    dir = dirname(dir);
  }
  for (;;) {
    if (existsSync(join(dir, "package.json"))) return norm(dir);
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}
