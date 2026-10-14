import { defineConfig } from "vite-plus";

// One config for the whole toolchain: tests (Vitest), lint (Oxlint), format (Oxfmt) and
// packaging (tsdown). The CSS in src/ is plain CSS and needs no Vite build.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // The CLI tests spawn node and the matrix test compiles 238 files.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
  lint: {
    ignorePatterns: [
      "css/**",
      "dist/**",
      "dist-dev*/**",
      "site/**",
      "src/**",
      "test/reference/**",
      "test/visual/report*/**",
      "test/visual/extras-report/**",
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ["typescript", "unicorn", "oxc", "node", "promise"],
    categories: { correctness: "error", suspicious: "error", perf: "error" },
    rules: {
      // Type-aware rules (tsgolint).
      "typescript/no-floating-promises": "error",
      "typescript/no-misused-promises": "error",
      "typescript/await-thenable": "error",
      "typescript/no-unnecessary-type-assertion": "error",
      "typescript/no-unsafe-argument": "error",
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-return": "error",
      "typescript/restrict-template-expressions": "error",
      "typescript/no-base-to-string": "error",
      // Off on purpose:
      // - The compiler walks the Lightning CSS selector AST, whose types are wide unions, and
      //   narrows them with small casts in a dozen places. A type guard for each would only
      //   restate the discriminant check next to it.
      "typescript/no-unsafe-type-assertion": "off",
      // - Matrix builds, file writes and Playwright pages run one after another on purpose:
      //   parallel Lightning CSS runs and browser pages only add memory pressure here.
      "eslint/no-await-in-loop": "off",
      // - Lightning CSS visitor callbacks return nothing to keep a node and an array to
      //   replace it, so mixed returns are the API.
      "typescript/consistent-return": "off",
      // - Style only; small helpers sit next to the one place that uses them.
      "unicorn/consistent-function-scoping": "off",
      // The selector switches handle the component kinds they care about and fall through the
      // rest on purpose.
      "typescript/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],
    },
  },
  fmt: {
    printWidth: 100,
    // Keep the code samples in Markdown as written (the README shows plain HTML link tags).
    embeddedLanguageFormatting: "off",
    // package.json keeps the order it has now.
    sortPackageJson: false,
    ignorePatterns: [
      // Build output and frozen references.
      "css/**",
      "dist/**",
      "dist-dev*/**",
      "test/reference/**",
      "test/visual/report*/**",
      "test/visual/extras-report/**",
      "pnpm-lock.yaml",
      // Not part of the toolchain scope: the docs site, example pages and HTML fixtures.
      "site/**",
      "examples/**",
      "**/*.html",
      // Written by scripts/generate.ts. Formatting them would only be undone by the next run.
      "src/tokens/palette.css",
      "src/tokens/scheme.css",
      "src/themes/**",
      "src/colors/**",
      // Data files that are generated or machine-sized.
      "scripts/data/palette.json",
      "test/api/baseline.json",
    ],
  },
  pack: {
    // dist/cli.js is the `pico-reforged` binary, dist/compiler.js the library entry.
    entry: { cli: "scripts/cli.ts", compiler: "scripts/lib/compiler/index.ts" },
    format: "esm",
    platform: "node",
    target: "node22.18",
    dts: true,
    // package.json has "type": "module", so ship .js and .d.ts, not .mjs and .d.mts.
    fixedExtension: false,
    clean: true,
  },
});
