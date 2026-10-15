import Link from "next/link";
import { SITE_NAME } from "../lib/site";
import { Mark } from "./icons";

/** Text logo with the site mark. Not the Pico CSS logo. */
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label={`${SITE_NAME} home`}>
      <Mark size={26} />
      <span>{SITE_NAME}</span>
    </Link>
  );
}
