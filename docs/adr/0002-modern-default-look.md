# ADR 0002: a modern default look

Status: accepted
Date: 2026-10-15
Amends: [ADR 0001](0001-plain-css-rewrite.md)

## Context

ADR 0001 rewrote Pico CSS v2.1.1 as plain CSS and kept its output pixel for pixel. That made the migration safe, but it also kept a look that reads as dated next to current component libraries:

- The root font size grew at every breakpoint, up to 131.25%. At 1280px to 1440px body text was 20px and a button was 62px tall.
- Corners were 4px, cards sat on a seven-layer grey shadow, and the dark scheme was a navy blue with cards that had no visible edge.
- Field borders were lighter than 3:1 against the page, so they failed WCAG 1.4.11. Focus rings were translucent and also stayed under 3:1.
- The secondary button was a solid slate block, headings were bold at 700, list markers were squares and table headers had a 3px rule.

## Decision

The default look changes. The public surface does not.

What stays:

- Every class, attribute hook, element rule and `--pico-*` variable of v2.1.1. `pnpm test:api` passes unchanged. One variable is added: `--pico-card-border-radius`.
- The markup. A v2.1.1 page renders without edits.
- Specificity at the v2.1.1 level or lower. New selectors use `:where()`.
- The 20 themes and their fill colors, the classless, conditional and fluid builds, the file matrix and the browser floor.

What changes, all through token values and the rules that read them:

| Area      | Before (v2.1.1)                            | Now                                                                                   |
| --------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| Root size | 100% to 131.25% over five breakpoints      | 100%, and 106.25% from 1536px                                                         |
| Density   | controls 0.75rem by 1rem padding           | 0.5rem by 0.75rem, so a control is 42px tall; cards and sections pad 1.25rem          |
| Radius    | 0.25rem everywhere                         | 0.5rem on controls, `--pico-card-border-radius` (0.75rem) on cards and menus          |
| Fonts     | `system-ui` first                          | Inter when the page provides it, then Segoe UI Variable, then the system stack        |
| Neutrals  | zinc and slate steps, navy dark background | one low-chroma ramp on hue 265, a near-neutral dark background (L 0.165)              |
| Shadows   | seven layers of grey                       | a 1px ring plus two short drops, deeper for menus and dialogs                         |
| Fields    | tinted fill, border about 1.5:1            | white fill, border 3.1:1 in light and 3.5:1 in dark, a hover step and a soft ring     |
| Focus     | translucent ring, under 3:1                | solid outline on `:focus-visible` for buttons, links, checkboxes; at least 3:1        |
| Secondary | solid slate                                | tonal: a light grey fill with dark text (14.5:1)                                      |
| Headings  | 700, 2rem h1                               | 600, 2.25rem h1, tighter letter spacing, `text-wrap: balance`                         |
| Tables    | bold headers, 3px rule                     | muted 0.875em headers at 500, 1px rule, tabular numbers                               |
| Extras    | stripes and solid pills                    | bordered alerts, soft badges, tinted pagination and tabs, a check mark in the stepper |

Contrast was computed for every theme in both schemes with `test/visual/contrast-probe.ts` on the built files. The lowest values are: button text 4.52:1 (green, light), links 5.01:1 (purple, light), muted text 6.01:1 on the page, cards and menus, secondary text on its fill 13.06:1, field border 3.12:1 and focus color 4.29:1. `primary-focus` is now opaque. The theme generator moves it one palette step darker (light) or lighter (dark) until it reaches 3:1 on the page, so light hues such as amber and yellow pass too, and custom themes get the same treatment. `pnpm test:extras` reports no axe violations.

## Visual tests

The v2.1.1 pixel comparison no longer describes success, so it becomes a report: `pnpm test:visual:parity`, never gated. `pnpm test:visual` now compares the build against `test/reference/current`, the reviewed output of this project, and fails when a fixture differs by more than 0.05% of its pixels or 2px of height. After a deliberate visual change the report is reviewed and `node test/visual/freeze.ts` updates the baseline.

## Consequences

- A page that relied on the old proportions, for example a layout tuned to a 20px root, looks smaller. `docs/migration.md` has a block of variables that brings most of the v2.1.1 look back, and lists what variables cannot restore.
- Buttons and links no longer show a ring on mouse focus. Keyboard focus shows a solid outline.
- The minified files grew by about 4% gzipped (`pico.min.css` 11,663 to 12,152 bytes). The budget for this change was 5%.
- A default-look change is a breaking change in practice, so it belongs in a major release. The version number is left to the release.
