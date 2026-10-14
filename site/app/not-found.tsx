import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="container not-found">
      <h1>Page not found</h1>
      <p>The page you asked for does not exist or has moved.</p>
      <p>
        <Link href="/docs/getting-started/quick-start" role="button">
          Read the docs
        </Link>{" "}
        <Link href="/" role="button" className="secondary">
          Go home
        </Link>
      </p>
    </main>
  );
}
