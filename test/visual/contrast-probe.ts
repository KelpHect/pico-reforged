// Usage: node test/visual/contrast-probe.ts <css> ... prints WCAG contrast of key theme pairs in both schemes.
// Text pairs need 4.5:1. focusRing (the input's focus border and the button's focus outline),
// fieldBorder need 3:1. Lines below the minimum are printed with LOW and the exit code is 1.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const files = process.argv.slice(2);
const browser = await chromium.launch().catch(() => chromium.launch({ channel: "chrome" }));
let low = 0;
for (const f of files) {
  for (const scheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({ colorScheme: scheme });
    const page = await ctx.newPage();
    await page.setContent(
      `<!doctype html><html><head><style>${readFileSync(f, "utf8")}</style></head><body><main class="container"><a id="l" href="#">link</a><button id="b">Button</button><button id="s" class="secondary">Sec</button><button id="c" class="contrast">Con</button><input id="i"><mark id="m">mark</mark></main></body></html>`,
    );
    await page.focus("#i");
    await page.waitForTimeout(500);
    const out = await page.evaluate(() => {
      const cv = document.createElement("canvas").getContext("2d")!;
      const rgb = (c: string): number[] => {
        cv.clearRect(0, 0, 1, 1);
        cv.fillStyle = "#000";
        cv.fillStyle = c;
        cv.fillRect(0, 0, 1, 1);
        const d = cv.getImageData(0, 0, 1, 1).data;
        return [d[0]!, d[1]!, d[2]!, d[3]!];
      };
      const lum = (c: number[]) => {
        const l = c.slice(0, 3).map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * l[0]! + 0.7152 * l[1]! + 0.0722 * l[2]!;
      };
      const ratio = (a: string, b: string) => {
        const x = lum(rgb(a)),
          y = lum(rgb(b));
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
      const tok = (name: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      const bgColor = getComputedStyle(document.documentElement).backgroundColor;
      const o: Record<string, string> = {};
      for (const id of ["b", "s", "c"])
        o[`btn-${id}`] = ratio(cs(id).color, cs(id).backgroundColor).toFixed(2);
      o.link = ratio(cs("l").color, bgColor).toFixed(2);
      o.mutedOnPage = ratio(tok("--pico-muted-color"), bgColor).toFixed(2);
      o.mutedOnCard = ratio(tok("--pico-muted-color"), tok("--pico-card-background-color")).toFixed(
        2,
      );
      o.mutedOnDropdown = ratio(
        tok("--pico-muted-color"),
        tok("--pico-dropdown-background-color"),
      ).toFixed(2);
      o.secondaryOnFill = ratio(
        tok("--pico-secondary-inverse"),
        tok("--pico-secondary-background"),
      ).toFixed(2);
      o.fieldBorder = ratio(tok("--pico-form-element-border-color"), bgColor).toFixed(2);
      // The focus signal that has to reach 3:1: the input's border and the button's focus outline color.
      // The soft ring around the input is decoration on top of the border.
      o.focusRing = Math.min(
        ratio(cs("i").borderTopColor, bgColor),
        ratio(tok("--pico-primary-focus"), bgColor),
      ).toFixed(2);
      return o;
    });
    const nonText = new Set(["focusRing", "fieldBorder"]);
    const lows = Object.entries(out).filter(([k, v]) => Number(v) < (nonText.has(k) ? 3 : 4.5));
    low += lows.length;
    console.log(
      f.split("/").slice(-2).join("/"),
      scheme,
      JSON.stringify(out),
      lows.length ? `LOW ${lows.map(([k]) => k).join(" ")}` : "",
    );
    await ctx.close();
  }
}
await browser.close();
if (low) process.exit(1);
