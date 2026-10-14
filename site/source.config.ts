import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { remarkExample } from "./lib/remark-example";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: {
        headingIds: false,
        mdxAsPlaceholder: ["Example", "Tokens", "PropsTable"],
      },
    },
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: (plugins) => [remarkExample, ...plugins],
  },
});
