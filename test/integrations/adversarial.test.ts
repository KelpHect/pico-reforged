import assert from "node:assert/strict";
import { mkdirSync, symlinkSync } from "node:fs";
import { dirname } from "node:path";
import { test } from "vite-plus/test";
import { Engine } from "../../scripts/lib/integrations/process.ts";
import { makeProject } from "./helpers.ts";

const IMPORT = '@import "@rusticstack/pico-reforged";\n';

test("a router that sets aria-current at run time keeps the aria-current rules of a dropdown", async () => {
  // RouterLink (Vue Router, Nuxt), NavLink (React Router) and TanStack Link write
  // aria-current="page" on the active link. The source never contains the attribute.
  const dir = makeProject({
    "package.json": "{}",
    "src/Menu.vue": `<template><details class="dropdown"><summary>Menu</summary><ul><li><RouterLink to="/">Home</RouterLink></li></ul></details></template>`,
  });
  const out = await new Engine().process({ css: IMPORT, file: `${dir}/app.css`, purge: true });
  assert.ok(out);
  const flat = out.css.replace(/\s+/g, " ");
  assert.ok(
    /details\.dropdown[^{}]*li a\[aria-current\]/.test(flat),
    "the active-link rule of the dropdown was purged although the router sets aria-current",
  );
});

test("a workspace package linked with a plain range (npm and yarn workspaces) is scanned", async () => {
  // npm, yarn classic and bun workspaces write "*" or "^1.0.0", not "workspace:*". The package
  // is still a link in node_modules that points outside it.
  const dir = makeProject({
    "package.json": "{}",
    "apps/web/package.json": JSON.stringify({ name: "web", dependencies: { "@acme/ui": "*" } }),
    "apps/web/src/index.html": "<main></main>",
    "packages/ui/package.json": JSON.stringify({ name: "@acme/ui" }),
    "packages/ui/src/Modal.html": "<dialog><article><hgroup></hgroup></article></dialog>",
  });
  const link = `${dir}/apps/web/node_modules/@acme/ui`;
  mkdirSync(dirname(link), { recursive: true });
  symlinkSync(`${dir}/packages/ui`, link, "junction");
  const out = await new Engine().process({
    css: IMPORT,
    file: `${dir}/apps/web/src/app.css`,
    purge: true,
  });
  assert.ok(out);
  assert.ok(
    /(^|[\s,}{])dialog\b/.test(out.css),
    "dialog rules of the linked workspace package were purged and no warning was given",
  );
});
