# AGENTS.md

Guidance for people and agents working on this repository. If you are writing a page that uses Pico Reforged, read `skills/pico-reforged/SKILL.md` instead.

Pico Reforged (`@rusticstack/pico-reforged`) is a fork of Pico CSS v2.1.1 by Lucas Larroche (MIT), rewritten as plain modern CSS. Pico CSS is archived upstream. This project is not the official Pico CSS and must not use the Pico name or logo as its own brand. Say "Pico Reforged" everywhere. `docs/adr/0001-plain-css-rewrite.md` has the reasons for the design and `docs/architecture.md` explains the parts.

## Layout

- `src/` is the CSS source, plain CSS. Entries: `pico.css`, `pico.classless.css`, `pico.colors.css`, `pico.extras.css`. Modules sit in `reset/`, `layout/`, `content/`, `forms/`, `components/`, `utilities/` and opt-in extras in `extras/`. File names match the v2.1.1 module names.
- `scripts/` holds the compiler (`scripts/lib/compiler`), the CLI (`scripts/cli.ts`), the Vite and PostCSS integrations (`scripts/integrations`) and the generators.
- `css/` is build output with the same file names as v2.1.1. Never edit it by hand.
- `ai/` and `skills/pico-reforged/` are the files for agents and tools. `docs/` is the written documentation. `test/` has the suites, fixtures and the frozen v2.1.1 reference.

## Commands

pnpm is the package manager and Vite+ (`vp`) runs tests, lint and format from `vite.config.ts`.

- `pnpm build`: generate tokens, themes and the AI files, then write the whole file matrix into `css/`. It is slow (several minutes).
- `pnpm generate` and `pnpm generate:ai`: only the generated sources.
- `pnpm test`: Vitest. `pnpm test:api`: coverage of the v2.1.1 public surface. `pnpm test:visual`: pixel diff against v2.1.1. `pnpm test:extras`: screenshots and axe-core for each extra.
- The visual and extras harnesses build unminified CSS by default. Selector factoring only runs on minified output, so after compiler changes also run `node scripts/dev-build.ts --minify --out dist-dev-min` with `node test/visual/run.ts --new dist-dev-min`, and `node test/visual/extras.ts --minify`. Both also take `--targets modern`.
- `pnpm check`: format, lint and types. `pnpm fmt`, `pnpm lint`, `pnpm typecheck` run one part. Oxfmt uses `printWidth: 100`.
- `pnpm run pack`: build `dist/` with tsdown. Plain `pnpm pack` is pnpm's own command.

Browser floor: Chrome and Edge 111, Firefox 128, Safari and iOS 16.4. No legacy builds. `targets: "modern"` (Chrome and Edge 123, Firefox 128, Safari 17.5) is an opt-in preset that keeps native nesting and `light-dark()`. The files in `css/` always use the default floor.

## Compiler pipeline

`docs/architecture.md` has the details. The parts that are easy to break:

- Lowering for the targets runs once, in the last pass. Earlier passes get no targets, otherwise prefixed declarations and the `--lightningcss-*` toggles are written more than once.
- Purge runs before minify. Selector factoring (`scripts/lib/compiler/factor.ts`) runs in the minify pass and only merges selectors of the same specificity tier, with pseudo-classes from a floor-safe allowlist.
- `pico-reforged purge` on built files judges each `:is()` branch on its own and flattens native nesting first.
- Colors are written with the shortest OKLCH digits that keep the same 8-bit sRGB value (`scripts/lib/color.ts`).
- Minified files get a one-line banner. Keep the MIT notice and both copyright holders in it.

## Generated and hand-written files

Do not edit these, change the source and run the generator:

- `src/tokens/palette.css`, `src/tokens/scheme.css`, `src/themes/*.css`, `src/colors/*.css`: from `scripts/data/` (`palette.json`, `scheme.ts`, `themes.ts`) by `scripts/generate.ts`.
- `ai/tokens.json`, `ai/components.json`, `skills/pico-reforged/references/components.md` and `extras.md`: by `scripts/generate-ai.ts` from the token CSS, `scripts/data/components.ts`, the modules and the fixtures. `test/ai/ai.test.ts` fails when they are stale or when a module or extra has no entry.
- `css/`: by `pnpm build`.

Everything else under `src/` is hand-written. A new module or extra needs an entry in `scripts/data/components.ts`.

## CSS rules

- Every framework rule is inside the `pico` layer, in the order `pico.tokens, pico.theme, pico.core, pico.extras, pico.utilities` (`src/layers.css`). Module files contain no `@layer` block. The entry files assign layers when they import.
- Core modules go in `pico.core` in the v2.1.1 order. Extras go in `pico.extras`, after core. Color utilities go in `pico.utilities`.
- Colors are OKLCH. Light and dark values are written once with `light-dark()`. Tokens are declared on `:root, :host, [data-theme]` so nested `data-theme` works. Modules use tokens, not raw colors.
- Keep specificity at the v2.1.1 level or lower (`:where()`), nest no deeper than three levels, and use logical properties so RTL works without overrides.
- Semantic HTML and ARIA first. An extra uses at most one documented `data-*` hook and needs no class, so it works in the classless build. Motion respects `prefers-reduced-motion`.
- Each module starts with a one-line comment naming what it styles. The manifest reads that line as the summary, so keep it accurate.
- Every public selector, class, attribute and `--pico-*` variable of v2.1.1 stays unless `docs/migration.md` lists the removal. `test/api/baseline.json` holds that surface and `pnpm test:api` checks it.

## Adding an extra

1. `src/extras/<name>.css` with its tokens (`--pico-<name>-*`) at the top, then `src/pico.extras.css` and the `EXTRAS` list in `scripts/lib/compiler/config.ts`.
2. A fixture in `test/fixtures/extras/<name>.html`, then `pnpm test:extras`.
3. An entry in `scripts/data/components.ts`, then `pnpm generate:ai`.
4. `pnpm check` and `pnpm test`.

## Writing style

This applies to code, comments, docs, commit messages and PR text.

- No em dashes or en dashes. Use a comma, a colon, parentheses, a period or a plain hyphen. Use straight quotes.
- Plain, direct, short. Write like a developer. No filler intros or wrap-up summaries, no emoji.
- Avoid buzzwords and marketing language.
- Comment only when the reason is not obvious. Match the style of the file you are in.
- Commit messages are `type: short description`, for example `fix: button focus ring`. Do not add AI attribution or co-author trailers to commits, PRs or code.
