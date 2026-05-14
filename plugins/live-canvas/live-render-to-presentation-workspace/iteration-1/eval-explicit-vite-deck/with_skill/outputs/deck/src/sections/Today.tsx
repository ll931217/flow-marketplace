/**
 * "Today" slide — what the canvas currently contains. Counts are derived
 * by tallying the world snapshot at authoring time; no fetch at render.
 */
export function Today() {
  return (
    <section className="section">
      <div className="eyebrow">§01 · Today</div>
      <h2 className="h2">State of the world</h2>
      <p className="lede">
        Two regions group the architecture into a platform half and a data
        half. Three components live on each side, joined by four edges and
        flagged with two unresolved annotations.
      </p>
      <div className="grid-3">
        <div className="card">
          <div className="card-title" style={{ color: 'var(--blue)' }}>Platform services</div>
          <div className="card-body">
            Auth, Billing, Orders. Owned by the platform team; deployed
            independently.
          </div>
          <div className="card-body mono" style={{ fontSize: '12px', marginTop: '6px' }}>
            region_platform
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ color: 'var(--green)' }}>Data plane</div>
          <div className="card-body">
            User DB, Ledger Bus, Orders Warehouse. Shared infrastructure
            owned by the data team.
          </div>
          <div className="card-body mono" style={{ fontSize: '12px', marginTop: '6px' }}>
            region_data
          </div>
        </div>
        <div className="card" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
          <div className="card-title" style={{ color: 'var(--accent)' }}>Open issues</div>
          <div className="card-body">
            Two unresolved annotations from the team — pricing ownership
            and warehouse retention.
          </div>
          <div className="card-body mono" style={{ fontSize: '12px', marginTop: '6px', color: 'var(--accent)' }}>
            see §04
          </div>
        </div>
      </div>
    </section>
  )
}
