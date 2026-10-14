// Builds test/api/baseline.json from the frozen v2.1.1 reference CSS.
import { transform } from 'lightningcss';
import type { SelectorComponent } from 'lightningcss';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export interface Api {
  classes: string[];
  attributes: string[];
  properties: string[];
  keyframes: string[];
  elements: string[];
}

type Selector = SelectorComponent[];

// Returns sorted lists of names used by a stylesheet (Buffer or string).
export function extractApi(code: Buffer | string, filename = 'x.css'): Api {
  const classes = new Set<string>();
  const attributes = new Set<string>();
  const properties = new Set<string>();
  const keyframes = new Set<string>();
  const elements = new Set<string>();

  const walk = (selector: Selector | Selector[]): void => {
    if (!Array.isArray(selector)) return;
    const first = selector[0];
    if (Array.isArray(first)) {
      (selector as Selector[]).forEach(walk);
      return;
    }
    for (const c of selector as Selector) {
      switch (c.type) {
        case 'class':
          classes.add(c.name);
          break;
        case 'attribute': {
          const op = c.operation;
          attributes.add(op ? `${c.name}${opSymbol(op.operator)}${op.value}` : c.name);
          break;
        }
        case 'type':
          elements.add(c.name);
          break;
        case 'pseudo-class': {
          const sels = (c as { selectors?: Selector[] }).selectors;
          if (Array.isArray(sels)) sels.forEach(walk);
          break;
        }
        case 'pseudo-element': {
          const sel = (c as { selector?: Selector }).selector;
          if (sel) walk(sel);
          break;
        }
      }
    }
  };

  transform({
    filename,
    code: Buffer.isBuffer(code) ? code : Buffer.from(code),
    minify: false,
    errorRecovery: true,
    visitor: {
      Selector(sel) {
        walk(sel);
      },
      Rule: {
        keyframes(rule) {
          const name = rule.value.name as unknown;
          keyframes.add(
            typeof name === 'string' ? name : ((name as { value?: string }).value ?? String(name)),
          );
        },
      },
      Declaration: {
        custom(decl) {
          if (decl.name.startsWith('--pico-')) properties.add(decl.name);
        },
      },
    },
  });

  const out = (s: Set<string>): string[] => [...s].sort();
  return {
    classes: out(classes),
    attributes: out(attributes),
    properties: out(properties),
    keyframes: out(keyframes),
    elements: out(elements),
  };
}

const symbols: Record<string, string> = {
  equal: '=',
  includes: '~=',
  'dash-match': '|=',
  prefix: '^=',
  substring: '*=',
  suffix: '$=',
};

function opSymbol(op: string): string {
  return symbols[op] ?? `?${op}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(here, '..', 'reference', 'v2.1.1');
  const baseline: Record<string, Api> = {};
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.css')).sort()) {
    baseline[f] = extractApi(readFileSync(join(dir, f)), f);
  }
  writeFileSync(join(here, 'baseline.json'), JSON.stringify(baseline, null, 2) + '\n');
  for (const [f, v] of Object.entries(baseline)) {
    console.log(
      `${f}: ${v.classes.length} classes, ${v.attributes.length} attrs, ${v.properties.length} props, ${v.keyframes.length} keyframes, ${v.elements.length} elements`,
    );
  }
}
