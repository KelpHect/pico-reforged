import Link from "next/link";
import { ExampleThumb } from "./ExampleThumb";

/** A linked preview of a full example page, for layouts a live frame cannot show. */
export function ExamplePreview({ slug, title, caption }: { slug: string; title: string; caption?: string }) {
  return (
    <figure className="example example-preview">
      <figcaption className="example-bar">
        <span>{caption ?? title}</span>
        <Link href={`/examples/${slug}`}>Open the full page</Link>
      </figcaption>
      <div className="example-preview-thumb">
        <ExampleThumb slug={slug} title={title} eager />
      </div>
    </figure>
  );
}
