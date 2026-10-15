type Attribute = { type: string; name: string; value: unknown };
type Node = {
  type: string;
  name?: string;
  value?: string;
  lang?: string | null;
  attributes?: Attribute[];
  children?: Node[];
};

// Markup that renders outside the normal flow (top layer, fixed or absolutely placed menus)
// adds nothing to the measured height, so these frames keep their height as a minimum.
const OVERLAY = /<dialog|\bpopover\b|data-placement|class="dropdown"|data-toast|data-tooltip|position:\s*fixed/;

/**
 * Lets writers put a fenced block inside <Example>. The first code block becomes the `code`
 * prop (and `lang` when set), so the component gets the exact source for the iframe and the
 * highlighted listing, with no MDX parsing of the HTML. It also marks overlay demos and loads
 * the first two examples of a page eagerly.
 */
export function remarkExample() {
  return (tree: Node) => {
    let count = 0;
    const walk = (node: Node) => {
      if (node.type === "mdxJsxFlowElement" && node.name === "Example" && node.children) {
        node.attributes ??= [];
        const attrs = node.attributes;
        const has = (name: string) => attrs.some((attr) => attr.name === name);
        const index = node.children.findIndex((child) => child.type === "code");
        let code = "";
        if (index !== -1) {
          const [block] = node.children.splice(index, 1);
          code = block.value ?? "";
          attrs.push({ type: "mdxJsxAttribute", name: "code", value: code });
        } else {
          const given = attrs.find((attr) => attr.name === "code");
          if (typeof given?.value === "string") code = given.value;
        }
        if (!has("overlay") && OVERLAY.test(code)) {
          attrs.push({ type: "mdxJsxAttribute", name: "overlay", value: null });
        }
        if (count < 2 && !has("eager")) {
          attrs.push({ type: "mdxJsxAttribute", name: "eager", value: null });
        }
        count += 1;
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
