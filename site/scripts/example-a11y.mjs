// The example pages come from the repository's visual-test fixtures, which are kept as they are.
// This pass adds the labels and focus handling a copied page should have: an accessible name on
// every bare form control, tabindex on scroll boxes, and a scroll wrapper around bare tables.

const SKIP_TYPES = new Set(["hidden", "submit", "button", "reset", "image"]);

function attr(tag, name) {
  const match = tag.match(new RegExp(`\s${name}\s*=\s*"([^"]*)"`, "i"));
  return match ? match[1] : null;
}

function escapeAttr(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

export function improveExample(html, { wrapTables = false } = {}) {
  const labelRanges = [];
  for (const match of html.matchAll(/<label\b[\s\S]*?<\/label>/gi)) {
    labelRanges.push([match.index, match.index + match[0].length]);
  }
  const labelFor = new Set(
    [...html.matchAll(/<label\b[^>]*\sfor\s*=\s*"([^"]*)"/gi)].map((match) => match[1]),
  );
  const insideLabel = (index) => labelRanges.some(([from, to]) => index >= from && index < to);

  html = html.replace(/<(input|select|textarea)\b[^>]*>/gi, (tag, name, index) => {
    if (insideLabel(index)) return tag;
    if (SKIP_TYPES.has((attr(tag, "type") ?? "").toLowerCase())) return tag;
    if (/\saria-label(ledby)?\s*=/i.test(tag)) return tag;
    const id = attr(tag, "id");
    if (id && labelFor.has(id)) return tag;
    let text = attr(tag, "placeholder") ?? attr(tag, "value");
    if (!text && name.toLowerCase() === "select") {
      const option = html.slice(index).match(/<option\b[^>]*>([^<]*)</i);
      text = option?.[1].trim();
    }
    text ||= attr(tag, "name") || attr(tag, "type") || name;
    return tag.replace(/\s*\/?>$/, (end) => ` aria-label="${escapeAttr(text)}"${end}`);
  });

  // Nested [data-theme] boxes recompute the color tokens but keep the inherited text color.
  html = html.replace(
    "</head>",
    "<style>[data-theme] { color: var(--pico-color); } video { max-width: 100%; height: auto; }</style></head>",
  );
  html = html.replace(/<div class="overflow-auto"(?![^>]*tabindex)/gi, '<div class="overflow-auto" tabindex="0"');
  if (!wrapTables) return html;
  html = html.replace(
    /(<\/h[1-6]>\s*)(<table\b[\s\S]*?<\/table>)/gi,
    (_, lead, table) => `${lead}<div class="overflow-auto" tabindex="0">${table}</div>`,
  );
  return html;
}
