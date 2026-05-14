/**
 * Region: region_data ("Data plane").
 * Description verbatim from world.entities.region_data.metadata.description.
 * Entities inside the region (centre-containment): db_users, bus_ledger, warehouse_orders.
 */
const stores = [
  {
    id: 'db_users',
    title: 'User DB',
    kind: 'Database',
    note: 'Source of truth for accounts.',
  },
  {
    id: 'bus_ledger',
    title: 'Ledger Bus',
    kind: 'Bus',
    note: 'Async event spine between services.',
  },
  {
    id: 'warehouse_orders',
    title: 'Orders Warehouse',
    kind: 'Database',
    note: 'Analytics store — 90-day retention.',
  },
]

export function DataPlane() {
  return (
    <section className="section">
      <div className="eyebrow">§03 · Data plane</div>
      <h2 className="h2">
        Shared <span style={{ color: 'var(--green)' }}>infrastructure</span>
      </h2>
      <p className="lede">
        Shared infrastructure. Owned by the data team.
      </p>

      <div className="grid-3">
        {stores.map((s) => (
          <div
            key={s.id}
            className="card"
            style={{ borderColor: 'var(--green)' }}
          >
            <div
              className="card-title"
              style={{ color: 'var(--green)' }}
            >
              {s.title}
            </div>
            <div
              className="card-body mono"
              style={{ fontSize: '12px' }}
            >
              {s.id}
            </div>
            <div className="card-body" style={{ marginTop: '10px' }}>
              {s.note}
            </div>
            <div style={{ marginTop: '10px' }}>
              <span className="tag">{s.kind}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
