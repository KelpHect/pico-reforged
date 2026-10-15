# Browser support

Pico Reforged supports current browsers only. The floor is the same as Tailwind CSS v4:

| Browser            | Minimum |
| ------------------ | ------- |
| Chrome, Edge       | 111     |
| Firefox            | 128     |
| Safari, iOS Safari | 16.4    |

The compiler's default `targets` is the browserslist query `chrome >= 111, edge >= 111, firefox >= 128, safari >= 16.4, ios_saf >= 16.4`, exported as `DEFAULT_TARGETS` from `@rusticstack/pico-reforged/compiler`. The ready-made files in `css/` are built with it.

At the floor, cascade layers, `:has()`, range media queries and OKLCH colors are native and are written to the output as they are in source. Nesting and `light-dark()` are not native in every floor browser, so Lightning CSS flattens nesting and lowers `light-dark()` to custom properties that follow `color-scheme`.

Newer features are additive. Where a floor browser does not support one, the page still works:

| Feature                                     | Without support                                     |
| ------------------------------------------- | --------------------------------------------------- |
| Popover and `popover="hint"`                | the element shows as normal content                 |
| Anchor positioning                          | popovers open in the top layer with fixed placement |
| `@starting-style` and `transition-behavior` | no open or close animation on dialogs and popovers  |
| `::details-content` and `interpolate-size`  | accordions open and close instantly                 |

There is no unlayered build and no polyfill. If you need an older browser, pass your own query with `--targets` or the `targets` option; those browsers are not tested.

## Modern preset

`targets: "modern"` (or `--targets modern`) is an optional higher floor, Baseline 2024: Chrome and Edge 123, Firefox 128, Safari and iOS Safari 17.5. It is exported as `MODERN_TARGETS`, and the ready-made files in `css/` do not use it. At this floor Lightning CSS keeps native nesting, `light-dark()` and OKLCH in the output instead of lowering them, so the files are smaller (minified, with banner, raw / gzip -9 / brotli q11):

| File               | Default floor            | Modern                   |
| ------------------ | ------------------------ | ------------------------ |
| `pico`             | 77,969 / 11,663 / 10,281 | 69,917 / 11,275 / 9,957  |
| `pico.classless`   | 67,467 / 10,609 / 9,396  | 60,484 / 10,274 / 9,105  |
| `pico.extras`      | 44,864 / 7,348 / 6,527   | 37,391 / 6,927 / 6,180   |
| `pico.conditional` | 80,881 / 11,837 / 10,379 | 78,110 / 11,652 / 10,228 |

Builds with `scope` or `purge` flatten nesting first, because those passes judge whole selectors, so `pico.conditional` only gains the `light-dark()` part. Selector factoring skips rules that still contain nesting.

`pico-reforged purge` accepts modern output. It flattens the nesting before it judges selectors and writes the rules flat, so the purged file keeps `light-dark()` but no longer nests. Run it with the same `--targets` you built with if you changed them.

## Serving

Precompress with brotli at quality 11 when you serve the files yourself (about 1 KB smaller than q5). If your server or CDN supports compression dictionaries (RFC 9842), serve `pico.min.css` as the dictionary for the theme variants: `pico.jade.min.css` went from 10,438 to 120 bytes in a test. See the File size section of [architecture.md](architecture.md#file-size).
