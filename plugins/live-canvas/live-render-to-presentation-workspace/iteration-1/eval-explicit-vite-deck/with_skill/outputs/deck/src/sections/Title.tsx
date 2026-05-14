/**
 * Title slide. Derived from `world.metadata.title` in the snapshot.
 * The accented half ("Platform") is chosen so the accent lands on the
 * functional noun rather than the qualifier.
 */
export function Title() {
  return (
    <section className="section" style={{ marginTop: '32px' }}>
      <div className="eyebrow">Live Render · Briefing</div>
      <h1 className="h1">
        Order Fulfilment{' '}
        <span style={{ color: 'var(--accent)' }}>Platform</span>
      </h1>
      <p className="lede">
        Two regions, six services, two open questions for the room. The
        deck below mirrors the canvas one-to-one — every claim traces back
        to an entity on the live-render world.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
        <span className="tag tag-accent">2 regions</span>
        <span className="tag">6 nodes</span>
        <span className="tag">4 edges</span>
        <span className="tag">2 open issues</span>
      </div>
    </section>
  )
}
