// Usage: node test/visual/run.mjs [--new dist-dev] [--ref test/reference/v2.1.1] [--only kitchen-sink]
// Renders each fixture with the reference CSS and the new CSS, diffs the screenshots and
// writes test/visual/report/index.html and report.json.
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import http from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const fixturesDir = join(root, 'test', 'fixtures');
const reportDir = join(here, 'report');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const refDir = resolve(root, opt('ref', 'test/reference/v2.1.1'));
const newDir = resolve(root, opt('new', 'dist-dev'));
const only = opt('only', null);

const sheets = {
  'kitchen-sink': { __CSS__: 'pico.css' },
  modal: { __CSS__: 'pico.css' },
  classless: { __CSS__: 'pico.classless.css' },
  colors: { __CSS__: 'pico.css', __COLORS__: 'pico.colors.css' },
};

const modes = [
  { name: '1280-light', width: 1280, scheme: 'light' },
  { name: '1280-dark', width: 1280, scheme: 'dark' },
  { name: '375-light', width: 375, scheme: 'light' },
];

const injected = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
  }
`;

const types = { '.css': 'text/css', '.html': 'text/html; charset=utf-8' };

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);
    const [kind, name] = parts;
    const send = (code, body, type = 'text/plain') => {
      res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(body);
    };
    if (kind === 'page' && name) {
      const side = url.searchParams.get('side') === 'new' ? 'new' : 'ref';
      const file = join(fixturesDir, `${name}.html`);
      if (!existsSync(file)) return send(404, 'no fixture');
      let html = readFileSync(file, 'utf8');
      for (const [token, css] of Object.entries(sheets[name] ?? { __CSS__: 'pico.css' })) {
        html = html.replaceAll(token, `/${side}/${css}`);
      }
      return send(200, html, types['.html']);
    }
    if ((kind === 'ref' || kind === 'new') && name && !name.includes('..')) {
      const file = join(kind === 'ref' ? refDir : newDir, name);
      if (!existsSync(file)) return send(404, 'no css');
      return send(200, readFileSync(file), types[extname(file)] ?? 'text/plain');
    }
    send(404, 'not found');
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function launch() {
  try {
    return await chromium.launch();
  } catch (err) {
    console.warn(`Bundled Chromium failed (${err.message.split('\n')[0]}), trying system Chrome`);
    return chromium.launch({ channel: 'chrome' });
  }
}

async function shot(browser, base, fixture, side, mode) {
  const context = await browser.newContext({
    viewport: { width: mode.width, height: 800 },
    colorScheme: mode.scheme,
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  await page.goto(`${base}/page/${fixture}?side=${side}`, { waitUntil: 'load' });
  await page.addStyleTag({ content: injected });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => document.activeElement?.blur?.());
  const buf = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await context.close();
  return PNG.sync.read(buf);
}

function pad(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 255;
    out.data[i + 1] = 0;
    out.data[i + 2] = 255;
    out.data[i + 3] = 255;
  }
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function writeReport(results) {
  const rows = [...results].sort((a, b) => (b.mismatch ?? 101) - (a.mismatch ?? 101));
  const body = rows
    .map((r) => {
      if (r.error) {
        return `<section><h2>${esc(r.fixture)} <small>${esc(r.mode)}</small></h2><p class="err">${esc(r.error)}</p></section>`;
      }
      const img = (k) => `<figure><figcaption>${k}</figcaption><a href="img/${r.id}-${k}.png"><img loading="lazy" src="img/${r.id}-${k}.png"></a></figure>`;
      return `<section><h2>${esc(r.fixture)} <small>${esc(r.mode)}</small> <b>${r.mismatch.toFixed(3)}%</b> <small>${r.diffPixels} px, ref ${r.refHeight}px, new ${r.newHeight}px</small></h2><div class="row">${img('ref')}${img('new')}${img('diff')}</div></section>`;
    })
    .join('\n');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Visual report</title>
<style>
body{font:14px/1.4 system-ui,sans-serif;margin:1rem;background:#fafafa;color:#222}
h2{font-size:1rem;margin:1.5rem 0 .5rem}h2 small{font-weight:400;color:#666}
.row{display:flex;gap:.75rem;align-items:flex-start;overflow-x:auto}
figure{margin:0;flex:1 0 30%;min-width:240px}figcaption{font-weight:600;margin-bottom:.25rem}
img{width:100%;height:auto;border:1px solid #ccc;background:#fff}.err{color:#b00020}
</style></head><body>
<h1>Visual report</h1>
<p>Reference: ${esc(refDir)}<br>New: ${esc(newDir)}</p>
${body}
</body></html>
`;
  writeFileSync(join(reportDir, 'index.html'), html);
  writeFileSync(
    join(reportDir, 'report.json'),
    JSON.stringify({ ref: refDir, new: newDir, results: rows }, null, 2) + '\n',
  );
}

async function main() {
  rmSync(reportDir, { recursive: true, force: true });
  mkdirSync(join(reportDir, 'img'), { recursive: true });

  const fixtures = readdirSync(fixturesDir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.slice(0, -5))
    .filter((f) => !only || f === only);
  if (!fixtures.length) throw new Error(`no fixtures matched ${only ?? ''}`);

  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await launch();
  const results = [];

  try {
    for (const fixture of fixtures) {
      const needed = Object.values(sheets[fixture] ?? { __CSS__: 'pico.css' });
      const missing = needed.filter((f) => !existsSync(join(newDir, f)));
      for (const mode of modes) {
        const id = `${fixture}-${mode.name}`;
        if (missing.length) {
          results.push({ id, fixture, mode: mode.name, error: `missing in ${newDir}: ${missing.join(', ')}` });
          continue;
        }
        const a = await shot(browser, base, fixture, 'ref', mode);
        const b = await shot(browser, base, fixture, 'new', mode);
        const width = Math.max(a.width, b.width);
        const height = Math.max(a.height, b.height);
        const pa = pad(a, width, height);
        const pb = pad(b, width, height);
        const diff = new PNG({ width, height });
        const diffPixels = pixelmatch(pa.data, pb.data, diff.data, width, height, { threshold: 0.1 });
        const mismatch = (diffPixels / (width * height)) * 100;
        for (const [k, png] of [['ref', pa], ['new', pb], ['diff', diff]]) {
          writeFileSync(join(reportDir, 'img', `${id}-${k}.png`), PNG.sync.write(png));
        }
        results.push({
          id,
          fixture,
          mode: mode.name,
          mismatch,
          diffPixels,
          refHeight: a.height,
          newHeight: b.height,
        });
        console.log(`${id}: ${mismatch.toFixed(3)}% (${diffPixels} px, heights ${a.height}/${b.height})`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  writeReport(results);
  console.log(`Report: ${join(reportDir, 'index.html')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
