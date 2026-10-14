import type { Folder, Item, Node } from "fumadocs-core/page-tree";
import type { SidebarSection } from "../components/DocsSidebar";
import { source } from "./source";

function text(node: unknown): string {
  return typeof node === "string" ? node : "";
}

function pages(nodes: Node[]): Item[] {
  return nodes.flatMap((node) => {
    if (node.type === "page") return [node];
    if (node.type === "folder") return [...(node.index ? [node.index] : []), ...pages(node.children)];
    return [];
  });
}

export function getSidebar(): SidebarSection[] {
  const tree = source.getPageTree();
  const sections: SidebarSection[] = [];
  const loose: Item[] = [];
  for (const node of tree.children) {
    if (node.type === "folder") {
      const folder = node as Folder;
      sections.push({
        title: text(folder.name),
        items: pages([...(folder.index ? [folder.index] : []), ...folder.children]).map((page) => ({
          title: text(page.name),
          url: page.url,
        })),
      });
    } else if (node.type === "page") {
      loose.push(node);
    }
  }
  if (loose.length) {
    sections.unshift({ title: "Docs", items: loose.map((page) => ({ title: text(page.name), url: page.url })) });
  }
  return sections;
}
