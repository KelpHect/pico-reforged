import { Fragment, type ReactNode } from "react";
import { tokenInfo } from "../lib/tokens";

type TokenRow = { name: string; value?: string; description?: string };
type PropRow = { name: string; type?: string; default?: string; description?: string };

/** Description text: first letter capitalized, `code` spans rendered as code. */
function rich(text?: string): ReactNode {
  if (!text) return null;
  const value = text.charAt(0).toUpperCase() + text.slice(1);
  return value.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith("`") && part.endsWith("`") ? <code key={index}>{part.slice(1, -1)}</code> : <Fragment key={index}>{part}</Fragment>,
  );
}

/** Long font stacks read better cut after a few names, and data URIs say what they are. */
function short(name: string, value: string) {
  if (value.startsWith("url(\"data:image/svg")) return "SVG data URI";
  if (name.startsWith("--pico-font-family") && value.length > 72) return `${value.split(",").slice(0, 3).join(",")}, ...`;
  return value;
}

/** A list of CSS custom properties with their current defaults from ai/tokens.json. */
export function Tokens({ items }: { items: TokenRow[] }) {
  return (
    <dl className="ref-list">
      {items.map((item) => {
        const info = tokenInfo(item.name);
        const value = info?.value ? short(item.name, info.value) : item.value;
        return (
          <div className="ref-row" key={item.name} data-ref={`${item.name} ${item.description ?? ""}`.toLowerCase()}>
            <dt>
              <code>{item.name}</code>
            </dt>
            {value || info?.light ? (
              <dd className="ref-meta">
                {info?.light ? (
                  <span className="swatch-pair" title="Light and dark value">
                    <span style={{ background: info.light }} />
                    <span style={{ background: info.dark }} />
                  </span>
                ) : null}
                {value ? (
                  <code className="ref-chip" title={info?.value ?? value}>
                    {value}
                  </code>
                ) : null}
              </dd>
            ) : null}
            {item.description ? <dd className="ref-desc">{rich(item.description)}</dd> : null}
          </div>
        );
      })}
    </dl>
  );
}

/** A list of options, props or attributes. */
export function PropsTable({ items }: { items: PropRow[] }) {
  return (
    <dl className="ref-list">
      {items.map((item) => (
        <div className="ref-row" key={item.name} data-ref={`${item.name} ${item.description ?? ""}`.toLowerCase()}>
          <dt>
            <code>{item.name}</code>
          </dt>
          {item.type || item.default ? (
            <dd className="ref-meta">
              {item.type ? <code className="ref-chip">{item.type}</code> : null}
              {item.default ? (
                <span className="ref-default">
                  Default <code className="ref-chip">{item.default}</code>
                </span>
              ) : null}
            </dd>
          ) : null}
          {item.description ? <dd className="ref-desc">{rich(item.description)}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
