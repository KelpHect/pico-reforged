type TokenRow = { name: string; value?: string; description?: string };

/** A table of CSS custom properties. */
export function Tokens({ items }: { items: TokenRow[] }) {
  return (
    <div className="overflow-auto">
      <table className="striped">
        <thead>
          <tr>
            <th scope="col">Variable</th>
            <th scope="col">Default</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.name}>
              <th scope="row">
                <code>{item.name}</code>
              </th>
              <td>{item.value ? <code>{item.value}</code> : null}</td>
              <td>{item.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type PropRow = { name: string; type?: string; default?: string; description?: string };

/** A table of options, props or attributes. */
export function PropsTable({ items }: { items: PropRow[] }) {
  return (
    <div className="overflow-auto">
      <table className="striped">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Type</th>
            <th scope="col">Default</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.name}>
              <th scope="row">
                <code>{item.name}</code>
              </th>
              <td>{item.type ? <code>{item.type}</code> : null}</td>
              <td>{item.default ? <code>{item.default}</code> : null}</td>
              <td>{item.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
