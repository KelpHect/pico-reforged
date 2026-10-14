# Pico Reforged site

The documentation site for https://pico.rusticstack.com. Next.js 16 (App Router, static export), Fumadocs headless (`fumadocs-core`, `fumadocs-mdx`, no `fumadocs-ui`, no Tailwind). The page chrome is styled with Pico Reforged itself, through the PostCSS integration in `postcss.config.mjs`, so the site is also a test of that integration.

## Develop

From the repository root:

```shell
pnpm install
pnpm build            # writes css/, the site copies it into public/css
pnpm run pack         # writes dist/, the PostCSS plugin the site loads
pnpm --filter pico-reforged-site dev
```

`dev` and `build` first run `scripts/copy-css.mjs`. It copies the built CSS (all themes, class-less, extras), the example pages from `examples/`, and `SKILL.md` into `public/` (ignored by git). It also writes `public/css/site-themes.css`, the runtime theme sheet the header color picker uses.

Build and preview the static output:

```shell
pnpm --filter pico-reforged-site build
pnpm --filter pico-reforged-site preview   # serves out/ on http://localhost:3000
```

## Writing docs

Pages live in `content/docs/<section>/<page>.mdx`. Order comes from `meta.json` in each folder. Frontmatter takes `title` and `description`.

Live examples use `<Example>` with a fenced `html` block inside:

````mdx
<Example title="Primary button" height={140}>
```html
<button>Click</button>
```
</Example>
````

Props: `title` (required), `height` (px, leave it out to fit the content), `variant="classless"`, `css={["pico.extras"]}` (extra stylesheets from `public/css`, without `.min.css`), `bare` (no padding). Tables of variables and options use `<Tokens items={[...]} />` and `<PropsTable items={[...]} />`.

Every page is also served as Markdown at `/md/<section>/<page>.md`, and listed in `/llms.txt` and `/llms-full.txt`.

## Deploy to Vercel (free plan)

The site is a static export, so the free plan is enough. Do this once:

1. Create a Vercel project from the GitHub repository `rusticstack/pico-reforged`.
2. Project settings, General:
   - Root Directory: `site`
   - Turn on "Include source files outside of the Root Directory in the Build Step" (the build needs the workspace root).
   - Framework Preset: Next.js (from `vercel.json`).
3. Build settings come from `site/vercel.json`. They are the same as setting these by hand:
   - Install Command: `cd .. && pnpm install --frozen-lockfile`
   - Build Command: `cd .. && pnpm build && pnpm run pack && cd site && pnpm build`
   - Output Directory: `out`
   The root build and pack steps are needed because `css/` is built output and `dist/` (which holds the PostCSS plugin) is not committed.
4. Domains, add `pico.rusticstack.com`.
5. In the DNS of `rusticstack.com`, add a CNAME record: name `pico`, value `cname.vercel-dns.com`.

Vercel issues the certificate once the record resolves. Pushes to `main` deploy to production, other branches get preview URLs.

## Notes

- Next.js prefetches route segment files (`__next.*.txt`) for client navigation. On a host that does not map them, those requests 404 and the router falls back to a normal page load. Nothing breaks.
- Search is static: the index is exported to `/api/search` and downloaded on first use. That is fine for this size of site.
- Examples run in `sandbox="allow-scripts"` iframes with no same-origin access. The theme and color scheme reach them through `postMessage`.
- The footer and the migration page credit Pico CSS by Lucas Larroche (MIT). Pico Reforged is not the official Pico CSS and does not use its logo.
