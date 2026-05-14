/**
 * Snapshot of the live-render world as captured for this deck.
 * All counts are derived by hand from the canvas; do not refetch live state.
 */
const entityCounts = [
  { label: 'Nodes', value: '6', detail: 'services + stores' },
  { label: 'Edges', value: '4', detail: 'sync, async, data' },
  { label: 'Regions', value: '2', detail: 'platform · data plane' },
  { label: 'Annotations', value: '2', detail: 'both unresolved' },
]

const agenda = [
  { id: 'platform', title: 'Platform services', body: 'The three things users actually hit.' },
  { id: 'data', title: 'Data plane', body: 'Where the platform reads and writes.' },
  { id: 'wiring', title: 'Wiring', body: 'How those six pieces talk.' },
  { id: 'issues', title: 'Open issues', body: 'Two questions the canvas surfaced.' },
]

export function Today() {
  return (
    <section className="section">
      <div className="eyebrow">§01 · Today</div>
      <h2 className="h2">Where the platform stands</h2>
      <p className="lede">
        The canvas captures the current production topology and two
        unresolved annotations the team left during last week's standups.
      </p>

      <div className="grid-2">
        {entityCounts.map((c) => (
          <div key={c.label} className="card">
            <div
              className="card-title mono"
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--accent)',
                lineHeight: 1.1,
                margin: '4px 0 6px',
              }}
            >
              {c.value}
            </div>
            <div className="card-body">{c.detail}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '12px' }}>
        <div
          className="mono"
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          What we'll cover
        </div>
        <div className="grid-2">
          {agenda.map((a) => (
            <div key={a.id} className="card">
              <div className="card-title">{a.title}</div>
              <div className="card-body">{a.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
