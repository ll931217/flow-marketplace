/**
 * region_data → one slide. Same shape as PlatformRegion, with the
 * inbound edges from the platform side listed so the reader can see what
 * touches the data plane.
 */

interface NodeCard {
  id: string
  title: string
  kind: string
}

const dataNodes: NodeCard[] = [
  { id: 'db_users', title: 'User DB', kind: 'Database' },
  { id: 'bus_ledger', title: 'Ledger Bus', kind: 'Bus' },
  { id: 'warehouse_orders', title: 'Orders Warehouse', kind: 'Database' },
]

export function DataPlaneRegion() {
  return (
    <section className="section">
      <div className="eyebrow">§03 · Data plane</div>
      <h2 className="h2">Data plane</h2>
      <p className="lede">
        Shared infrastructure. Owned by the data team.
      </p>

      <div className="grid-3">
        {dataNodes.map((n) => (
          <div key={n.id} className="card">
            <div className="card-title" style={{ color: 'var(--green)' }}>{n.title}</div>
            <div className="card-body">
              <span className="tag">{n.kind}</span>
            </div>
            <div className="card-body mono" style={{ fontSize: '12px', marginTop: '8px' }}>
              {n.id}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '4px' }}>
        <div className="card-title">Inbound edges</div>
        <pre
          className="mono"
          style={{
            fontSize: '13px',
            lineHeight: 1.7,
            margin: 0,
            color: 'var(--text-secondary)',
          }}
        >
{`svc_auth     ──SQL────▶  db_users           (data)
svc_billing  ──event──▶  bus_ledger         (async)
svc_orders   ──SQL────▶  warehouse_orders   (data)`}
        </pre>
      </div>
    </section>
  )
}
