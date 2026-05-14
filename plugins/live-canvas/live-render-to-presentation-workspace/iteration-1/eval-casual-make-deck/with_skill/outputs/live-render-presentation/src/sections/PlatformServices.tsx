/**
 * Region: region_platform ("Platform services").
 * Description verbatim from world.entities.region_platform.metadata.description.
 * Entities inside the region (centre-containment): svc_auth, svc_billing, svc_orders.
 */
const services = [
  {
    id: 'svc_auth',
    title: 'Auth Service',
    icon: '🔐',
    kind: 'Component',
  },
  {
    id: 'svc_billing',
    title: 'Billing Service',
    icon: '💳',
    kind: 'Component',
  },
  {
    id: 'svc_orders',
    title: 'Orders Service',
    icon: '📦',
    kind: 'Component',
  },
]

export function PlatformServices() {
  return (
    <section className="section">
      <div className="eyebrow">§02 · Platform region</div>
      <h2 className="h2">
        Platform <span style={{ color: 'var(--blue)' }}>services</span>
      </h2>
      <p className="lede">
        User-facing services owned by the platform team. All three are
        deployed independently and talk over HTTP + the ledger bus.
      </p>

      <div className="grid-3">
        {services.map((s) => (
          <div
            key={s.id}
            className="card"
            style={{ borderColor: 'var(--blue)' }}
          >
            <div
              style={{
                fontSize: '24px',
                lineHeight: 1,
                marginBottom: '10px',
              }}
              aria-hidden
            >
              {s.icon}
            </div>
            <div
              className="card-title"
              style={{ color: 'var(--blue)' }}
            >
              {s.title}
            </div>
            <div
              className="card-body mono"
              style={{ fontSize: '12px' }}
            >
              {s.id}
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
