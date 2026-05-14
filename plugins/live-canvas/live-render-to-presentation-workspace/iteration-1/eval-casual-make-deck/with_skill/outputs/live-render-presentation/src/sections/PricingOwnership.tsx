/**
 * Annotation: annotation_naming (unresolved).
 * Text is verbatim from world.entities.annotation_naming.metadata.text.
 * Touches: svc_billing, svc_orders.
 */
const annotation = {
  text:
    'We agreed at standup that the billing service should not own pricing — move pricing-related endpoints to orders next sprint.',
  touched: [
    { id: 'svc_billing', title: 'Billing Service' },
    { id: 'svc_orders', title: 'Orders Service' },
  ],
}

export function PricingOwnership() {
  return (
    <section className="section">
      <div className="eyebrow">§05 · Open issue</div>
      <h2 className="h2">Pricing ownership</h2>
      <p className="lede">
        Annotation left on the canvas — billing currently owns pricing
        endpoints, which the team flagged as the wrong service boundary.
      </p>

      <div
        className="card"
        style={{
          borderColor: 'var(--accent)',
          background: 'var(--accent-soft)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--accent)',
            letterSpacing: '0.12em',
            marginBottom: '10px',
            textTransform: 'uppercase',
          }}
        >
          User annotation
        </div>
        <div style={{ fontSize: '16px', lineHeight: 1.7 }}>
          "{annotation.text}"
        </div>
      </div>

      <div style={{ marginTop: '4px' }}>
        <div
          className="mono"
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          Touches
        </div>
        <div className="grid-2">
          {annotation.touched.map((t) => (
            <div key={t.id} className="card">
              <div className="card-title">{t.title}</div>
              <div
                className="card-body mono"
                style={{ fontSize: '12px' }}
              >
                {t.id}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
