/**
 * Annotation: annotation_warehouse (unresolved).
 * Text is verbatim from world.entities.annotation_warehouse.metadata.text.
 * Touches: warehouse_orders.
 */
const annotation = {
  text:
    'Warehouse retention is 90 days — flag this in the deck so legal can sign off.',
  touched: [{ id: 'warehouse_orders', title: 'Orders Warehouse' }],
}

export function WarehouseRetention() {
  return (
    <section className="section">
      <div className="eyebrow">§06 · Open issue</div>
      <h2 className="h2">Warehouse retention</h2>
      <p className="lede">
        Annotation pinned to the Orders Warehouse. Needs explicit legal
        sign-off before the next compliance review.
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
            <div
              key={t.id}
              className="card"
              style={{ borderColor: 'var(--green)' }}
            >
              <div
                className="card-title"
                style={{ color: 'var(--green)' }}
              >
                {t.title}
              </div>
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
