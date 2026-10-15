import { Fragment, type ComponentProps } from "react";

// Inline code does not wrap (a token like --pico-background-color must not break at a hyphen).
// A long span instead gets its own break points, between words and after / . [ , inside a long
// token. Each piece stays on one line.
const LONG = 24;

function pieces(text: string) {
  const out: string[] = [];
  for (const word of text.split(/(?<= )/)) {
    if (word.length <= LONG) out.push(word);
    else out.push(...word.split(/(?<=[/.[,])/));
  }
  return out;
}

export function InlineCode({ children, className, ...props }: ComponentProps<"code">) {
  if (typeof children !== "string" || children.length <= LONG) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }
  return (
    <code className={className ? `${className} code-break` : "code-break"} {...props}>
      {pieces(children).map((piece, index) => (
        <Fragment key={index}>
          {index > 0 ? <wbr /> : null}
          <span>{piece}</span>
        </Fragment>
      ))}
    </code>
  );
}
