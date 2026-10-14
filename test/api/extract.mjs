// Builds test/api/baseline.json from the frozen v2.1.1 reference CSS.
import { transform } from 'lightningcss';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Returns sorted lists of names used by a stylesheet (Buffer or string).
export function extractApi(code, filename = 'x.css') {
  const classes = new Set();
  const attributes = new Set();
  const properties = new Set();
  const keyframes = new Set();
  const elements = new Set();

  const walk = (selector) => {
    if (!Array.isArray(selector)) return;
    if (selector.length && Array.isArray(selector[0])) return selector.forEach(walk);
    for (const c of selector) {
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
        case 'pseudo-class':
          if (Array.isArray(c.selectors)) c.selectors.forEach(walk);
          break;
        case 'pseudo-element':
          if (c.selector) walk(c.selector);
          break;
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
          keyframes.add(rule.value.name.value ?? rule.value.name);
        },
      },
      Declaration: {
        custom(decl) {
          if (decl.name.startsWith('--pico-')) properties.add(decl.name);
        },
      },
    },
  });

  const out = (s) => [...s].sort();
  return {
    classes: out(classes),
    attributes: out(attributes),
    properties: out(properties),
    keyframes: out(keyframes),
    elements: out(elements),
  };
}

function opSymbol(op) {
  return (
    {
      equal: '=',
      includes: '~=',
      'dash-match': '|=',
      prefix: '^=',
      substring: '*=',
      suffix: '$=',
    }[op] ?? `?${op}`
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(here, '..', 'reference', 'v2.1.1');
  const baseline = {};
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
