// Usage: node test/visual/contrast-probe.ts <css> ... prints WCAG contrast of key theme pairs in both schemes.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
const browser = await chromium.launch();
for (const f of files) {
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ colorScheme: scheme });
    const page = await ctx.newPage();
    await page.setContent(`<!doctype html><html><head><style>${readFileSync(f, 'utf8')}</style></head><body><main class="container"><a id="l" href="#">link</a><button id="b">Button</button><button id="s" class="secondary">Sec</button><button id="c" class="contrast">Con</button><input id="i"><mark id="m">mark</mark></main></body></html>`);
    await page.focus('#i'); await page.waitForTimeout(500);
    const out = await page.evaluate(() => {
      const cv = document.createElement('canvas').getContext('2d')!;
      const rgb = (c: string): number[] => { cv.clearRect(0,0,1,1); cv.fillStyle = '#000'; cv.fillStyle = c; cv.fillRect(0,0,1,1); const d = cv.getImageData(0,0,1,1).data; return [d[0]!, d[1]!, d[2]!, d[3]!]; };
      const lum = (c: number[]) => { const l = c.slice(0,3).map(v => { v/=255; return v<=0.03928? v/12.92 : ((v+0.055)/1.055)**2.4; }); return 0.2126*l[0]!+0.7152*l[1]!+0.0722*l[2]!; };
      const ratio = (a: string, b: string) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
      const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
      const page = getComputedStyle(document.documentElement).backgroundColor;
      const o: Record<string, string> = {};
      for (const id of ['b','s','c']) o[`btn-${id}`] = ratio(cs(id).color, cs(id).backgroundColor).toFixed(2);
      o.link = ratio(cs('l').color, page).toFixed(2);
      // focus ring: box-shadow color blended over page (approx alpha composite)
      const sh = cs('i').boxShadow; const m = sh.match(/rgba?\([^)]*\)|lab\([^)]*\)|oklch\([^)]*\)|color\([^)]*\)/);
      if (m) { const f = rgb(m[0]), p = rgb(page); const a = f[3]!/255; const mix = `rgb(${[0,1,2].map(i => Math.round(f[i]!*a+p[i]!*(1-a))).join(',')})`; o.focusRing = ratio(mix, page).toFixed(2); } o.shadow = sh.slice(0,90);
      o.bg = page; o.primaryBg = cs('b').backgroundColor; o.linkColor = cs('l').color;
      return o;
    });
    console.log(f.split(/[\/]/).slice(-2).join('/'), scheme, JSON.stringify(out));
    await ctx.close();
  }
}
await browser.close();
