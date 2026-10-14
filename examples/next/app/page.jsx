export default function Page() {
  return (
    <main className="container">
      <h1>Pico Reforged with Next.js</h1>
      <p>
        The PostCSS plugin compiles the stylesheet in <code>app/globals.css</code> and purges it in{" "}
        <code>next build</code>.
      </p>
      <button>Primary</button>
      <button className="secondary">Secondary</button>
    </main>
  );
}
