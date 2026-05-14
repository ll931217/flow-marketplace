/**
 * Closing slide. Restates the two unresolved annotations as concrete actions
 * so the team walks out of the review with owners assigned.
 */
const actions = [
  {
    id: 'pricing',
    title: 'Move pricing endpoints to Orders',
    owner: 'Platform team',
    when: 'Next sprint',
    source: 'annotation_naming',
  },
  {
    id: 'retention',
    title: 'Get legal sign-off on 90-day retention',
    owner: 'Data team + legal',
    when: 'Before next compliance review',
    source: 'annotation_warehouse',
  },
]

export function NextSteps() {
  return (
    <section className="section">
      <div className="eyebrow">§07 · Next steps</div>
      <h2 className="h2">
        Where we go <span style={{ color: 'var(--accent)' }}>from here</span>
      </h2>
      <p className="lede">
        Two actions out of today's review, both traced back to annotations
        already on the canvas.
      </p>

      <div className="grid-2">
        {actions.map((a) => (
          <div key={a.id} className="card">
            <div className="card-title">{a.title}</div>
            <div className="card-body" style={{ marginTop: '8px' }}>
              <div>
                <span
                  className="mono"
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginRight: '8px',
                  }}
                >
                  Owner
                </span>
                {a.owner}
              </div>
              <div style={{ marginTop: '4px' }}>
                <span
                  className="mono"
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginRight: '8px',
                  }}
                >
                  When
                </span>
                {a.when}
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <span className="tag mono">{a.source}</span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span className="tag tag-accent">Q&amp;A</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Floor's open — annotations stay on the canvas if anything else
          surfaces.
        </span>
      </div>
    </section>
  )
}
