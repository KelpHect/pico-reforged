type Node = {
  type: string;
  name?: string;
  value?: string;
  lang?: string | null;
  attributes?: { type: string; name: string; value: string }[];
  children?: Node[];
};

/**
 * Lets writers put a fenced block inside <Example>. The first code block becomes the `code`
 * prop (and `lang` when set), so the component gets the exact source for the iframe and the
 * highlighted listing, with no MDX parsing of the HTML.
 */
export function remarkExample() {
  return (tree: Node) => {
    const walk = (node: Node) => {
      if (node.type === "mdxJsxFlowElement" && node.name === "Example" && node.children) {
        const index = node.children.findIndex((child) => child.type === "code");
        if (index !== -1) {
          const [code] = node.children.splice(index, 1);
          node.attributes ??= [];
          node.attributes.push({ type: "mdxJsxAttribute", name: "code", value: code.value ?? "" });
        }
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
