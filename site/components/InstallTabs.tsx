import { useId } from "react";
import { CDN_URL, PACKAGE_NAME } from "../lib/site";
import { CodeBlock } from "./CodeBlock";

const TABS = [
  { id: "pnpm", label: "pnpm", lang: "bash", code: `pnpm add ${PACKAGE_NAME}` },
  { id: "npm", label: "npm", lang: "bash", code: `npm install ${PACKAGE_NAME}` },
  { id: "yarn", label: "yarn", lang: "bash", code: `yarn add ${PACKAGE_NAME}` },
  { id: "bun", label: "bun", lang: "bash", code: `bun add ${PACKAGE_NAME}` },
  { id: "cdn", label: "CDN", lang: "html", code: `<link rel="stylesheet" href="${CDN_URL}" />` },
];

/** Install commands as radio tabs (the tabs extra, no script). */
export function InstallTabs() {
  const name = `install-${useId().replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div data-tabs className="install-tabs">
      {TABS.map((tab, index) => (
        <InstallRadio key={tab.id} name={name} id={`${name}-${tab.id}`} label={tab.label} checked={index === 0} />
      ))}
      {TABS.map((tab) => (
        <section key={tab.id} aria-label={tab.label}>
          <CodeBlock code={tab.code} lang={tab.lang} className={tab.id === "cdn" ? "wrap" : undefined} />
        </section>
      ))}
    </div>
  );
}

function InstallRadio({ name, id, label, checked }: { name: string; id: string; label: string; checked: boolean }) {
  return (
    <>
      <input type="radio" name={name} id={id} defaultChecked={checked} />
      <label htmlFor={id}>{label}</label>
    </>
  );
}
