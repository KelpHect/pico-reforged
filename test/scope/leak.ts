// Usage: node test/scope/leak.ts [new.css] [ref.css]
// Renders test/fixtures/conditional.html with no sheet, the scoped sheet and the v2.1.1 scoped
// sheet. Lists computed values on the unstyled sibling sections (outside .pico) that differ from
// the no-sheet render in the new build but not in the same way in v2.1.1. Values inherited from
// :root and body leak in both builds; that is expected and only reported as a count.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readCss = (p: string) => readFileSync(resolve(p), "utf8");
const newCss = readCss(process.argv[2] ?? "css/pico.conditional.css");
const refCss = readCss(process.argv[3] ?? "test/reference/v2.1.1/pico.conditional.css");
const html = readFileSync(resolve("test/fixtures/conditional.html"), "utf8").replace(
  /<link[^>]*__CSS__[^>]*>/,
  "",
);

async function styles(css: string | null) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.setContent(
    css !== null ? html.replace("</head>", `<style>${css}</style></head>`) : html,
  );
  const out = await page.evaluate(() => {
    const res: Record<string, string> = {};
    document.querySelectorAll("[data-unstyled], [data-unstyled] *").forEach((el, i) => {
      const cs = getComputedStyle(el);
      for (let k = 0; k < cs.length; k++) {
        const p = cs[k] as string;
        if (p.startsWith("--")) continue;
        res[`${el.closest("[data-unstyled]")?.id} ${i} ${el.tagName.toLowerCase()} ${p}`] =
          cs.getPropertyValue(p);
      }
    });
    return res;
  });
  await browser.close();
  return out;
}

const [a, b, c] = [await styles(null), await styles(newCss), await styles(refCss)];
const leaks = (x: Record<string, string>) => new Set(Object.keys(a).filter((k) => a[k] !== x[k]));
const [ln, lr] = [leaks(b), leaks(c)];
// Values may differ (OKLCH tokens, color-scheme); what matters is which properties leak.
const newOnly = [...new Set([...ln, ...lr])].filter((k) => ln.has(k) !== lr.has(k));
console.log(
  `unstyled sibling: ${ln.size} computed values differ from no-CSS (new), ${lr.size} (v2.1.1)`,
);
console.log(`leaks differ from v2.1.1 on ${newOnly.length} properties`);
for (const k of newOnly.slice(0, 40)) console.log(`  ${k}: none ${a[k]}, new ${b[k]}, ref ${c[k]}`);
process.exit(newOnly.length ? 1 : 0);
