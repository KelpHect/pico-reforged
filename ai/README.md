# AI files

Two machine-readable files describe Pico Reforged for tools and coding agents. Both are generated, so do not edit them by hand. Run `pnpm generate:ai` (or `pnpm build`) after changing anything in `src/tokens`, `src/themes`, `src/extras`, a module in `src/`, a fixture in `test/fixtures` or `scripts/data/components.ts`. A test fails when they are stale.

They ship in the npm package and are importable:

```js
import tokens from "@rusticstack/pico-reforged/tokens.json" with { type: "json" };
import components from "@rusticstack/pico-reforged/components.json" with { type: "json" };
```

The agent skill that uses them is in `skills/pico-reforged/`.

## tokens.json

Design tokens in the W3C Design Tokens format (Format Module 2025.10). Every token has an explicit `$type`. Colors are `oklch` color objects (`components` are L, C, H and `alpha` is only present below 1), with an sRGB `hex` as a fallback for tools that cannot read OKLCH.

Groups:

| Group                                                                       | What it holds                                                                    |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `color`                                                                     | the semantic colors of the page (text, borders, buttons, forms, cards and so on) |
| `dimension`, `number`, `font-family`, `font-weight`, `transition`, `shadow` | the rest of the root tokens, grouped by type                                     |
| `palette`                                                                   | the OKLCH palette: one token per hue and step, plus the main color of each hue   |
| `theme`                                                                     | one group per built-in theme (20) with the primary set it defines                |
| `extras`                                                                    | root tokens of the opt-in extras, one group per extra                            |

Names are the CSS custom property without `--pico-`, so `--pico-primary-background` is `color.primary-background`. The exact property name is in `$extensions["com.rusticstack.pico-reforged"].cssVar`.

### Light and dark

The 2025.10 format has no modes. The choice here: `$value` is the light scheme, and the dark value sits in the vendor extension next to it.

```json
"muted-color": {
  "$type": "color",
  "$value": { "colorSpace": "oklch", "components": [0.5268, 0.0236, 264.35], "hex": "#646b79" },
  "$extensions": {
    "com.rusticstack.pico-reforged": {
      "cssVar": "--pico-muted-color",
      "dark": { "colorSpace": "oklch", "components": [0.6557, 0.0302, 265.34], "hex": "#8891a4" }
    }
  }
}
```

A token without `dark` has the same value in both schemes. This mirrors the CSS, where those tokens use `light-dark(light, dark)`. Aliases (`"{color.primary-background}"`) are resolved per scheme, so an alias needs no `dark` of its own.

### Primary colors and themes

The primary tokens in `color` alias the default theme: `color.primary` is `{theme.azure.primary}`. To read another theme, use `theme.<name>.primary` and the other tokens in that group. A custom theme from one color is not listed, because it is computed: use `pico-reforged build --theme "#e5484d"` or `@pico { theme: #e5484d; }`.

### Values the format cannot hold

The format has no type for percentages, `url()` icons, filters, `calc()`, `min()` or `color-mix()`. A token with such a value is not guessed into a type. It is listed in the root extension instead:

```json
"$extensions": {
  "com.rusticstack.pico-reforged": {
    "cssOnly": {
      "--pico-font-size": { "css": "100%", "responsive": [{ "minWidth": "576px", "css": "106.25%" }], "source": "src/tokens/core.css" }
    }
  }
}
```

`css` is the value as written, `dark` is the value in the dark scheme when it differs, `responsive` lists the overrides from width media queries. `font-size` and `container-max-width` also use `responsive`.

Only tokens set on `:root`, `:host` and `[data-theme]` are here. Hooks that a component sets on its own elements (`--pico-alert-accent`, `--pico-tooltip-slide-to` and similar) are not root tokens. They are listed per component under `tokens.defines` in `components.json`.

## components.json

One entry for every module of the core build and every opt-in extra. Each entry:

| Field      | Meaning                                                                                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`     | short name, unique                                                                                                                                                                           |
| `category` | `base`, `layout`, `content`, `forms`, `components`, `utilities` or `extras`                                                                                                                  |
| `optIn`    | how it gets into a build. `kind` is `core` (always in `pico.css`), `option` (off by default, `how` says how to turn it on) or `extra` (opt in, with the file, import, `@pico` and CLI forms) |
| `summary`  | the first comment of the module's CSS file                                                                                                                                                   |
| `use`      | one sentence on when to use it                                                                                                                                                               |
| `markup`   | the canonical example, or `null` when there is no markup to write                                                                                                                            |
| `examples` | every example with a `label`; the first one is `markup`                                                                                                                                      |
| `variants` | ways to switch the look: `trigger` is what to write, `selector` is the CSS it matches                                                                                                        |
| `states`   | the same for states such as `aria-current`, `aria-invalid` and `aria-busy`                                                                                                                   |
| `aria`     | accessibility notes                                                                                                                                                                          |
| `notes`    | extra remarks, when there are any                                                                                                                                                            |
| `tokens`   | `reads` lists the `--pico-*` tokens the module uses with `var()`. `defines` lists the properties it declares itself                                                                          |
| `js`       | the smallest script the component needs, or `null`                                                                                                                                           |

Markup is cut from the pages in `test/fixtures` and `test/fixtures/extras` (attributes such as `style` are dropped, image data is shortened), so it is the markup the tests render. `reads` and `defines` come from a Lightning CSS pass over each module. Each `selector` is checked against the module's CSS when the file is generated, so a renamed hook fails the build instead of leaving a wrong entry. Only the short texts (`use`, `trigger`, `description`, `aria`) and the choice of snippets are written by hand, in `scripts/data/components.ts`.
