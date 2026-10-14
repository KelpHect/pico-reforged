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
