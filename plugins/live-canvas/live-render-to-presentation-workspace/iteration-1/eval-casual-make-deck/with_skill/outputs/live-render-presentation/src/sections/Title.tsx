export function Title() {
  return (
    <section className="section" style={{ marginTop: '32px' }}>
      <div className="eyebrow">Architecture review · internal</div>
      <h1 className="h1">
        Order Fulfilment{' '}
        <span style={{ color: 'var(--accent)' }}>Platform</span>
      </h1>
      <p className="lede">
        A walk through the current shape of the platform — three services, three
        data stores, and two open questions the team needs to land before the
        next sprint.
      </p>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginTop: '8px',
        }}
      >
        <span className="tag tag-accent">2 regions</span>
        <span className="tag">6 services / stores</span>
        <span className="tag">2 open issues</span>
      </div>
    </section>
  )
}
