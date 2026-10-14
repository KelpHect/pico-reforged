import Link from "next/link";
import { SITE_NAME } from "../lib/site";

/** Text logo. Not the Pico CSS logo. */
export function Brand() {
  const [first, second] = SITE_NAME.split(" ");
  return (
    <Link href="/" className="brand" aria-label={`${SITE_NAME} home`}>
      <span className="brand-mark" aria-hidden="true">
        {first[0]}
        {second[0]}
      </span>
      <span>
        {first} <strong>{second}</strong>
      </span>
    </Link>
  );
}
