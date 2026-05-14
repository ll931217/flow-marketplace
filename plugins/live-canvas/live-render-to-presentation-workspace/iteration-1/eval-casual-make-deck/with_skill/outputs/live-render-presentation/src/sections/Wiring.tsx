/**
 * The four edges in the world, grouped by kind.
 * Pulled verbatim from world.entities.edge_*.
 */
const edges = [
  {
    id: 'edge_orders_billing',
    from: 'Orders Service',
    to: 'Billing Service',
    label: 'HTTP',
    kind: 'sync',
  },
  {
    id: 'edge_billing_ledger',
    from: 'Billing Service',
    to: 'Ledger Bus',
    label: 'event',
    kind: 'async',
  },
  {
    id: 'edge_auth_users',
    from: 'Auth Service',
    to: 'User DB',
    label: 'SQL',
    kind: 'data',
  },
  {
    id: 'edge_orders_warehouse',
    from: 'Orders Service',
    to: 'Orders Warehouse',
    label: 'SQL',
    kind: 'data',
  },
]

const kindColour: Record<string, string> = {
  sync: 'var(--blue)',
  async: 'var(--orange)',
  data: 'var(--green)',
}

export function Wiring() {
  return (
    <section className="section">
      <div className="eyebrow">§04 · Wiring</div>
      <h2 className="h2">How the pieces talk</h2>
      <p className="lede">
        Four edges, three flavours: synchronous HTTP between services,
        asynchronous events onto the ledger bus, and direct SQL into the
        owning datastore.
      </p>

      <div className="card">
        <pre
          className="mono"
          style={{
            fontSize: '13px',
            lineHeight: 1.9,
            margin: 0,
            whiteSpace: 'pre',
            overflowX: 'auto',
          }}
        >
          {edges.map((e) => {
            const arrow = `──${e.label.padEnd(5, '─')}─▶`
            const left = e.from.padEnd(18, ' ')
            return `${left}${arrow}  ${e.to}\n`
          })}
        </pre>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginTop: '4px',
        }}
      >
        {Object.entries(kindColour).map(([kind, colour]) => (
          <span
            key={kind}
            className="tag"
            style={{ color: colour, borderColor: colour }}
          >
            {kind}
          </span>
        ))}
      </div>
    </section>
  )
}
