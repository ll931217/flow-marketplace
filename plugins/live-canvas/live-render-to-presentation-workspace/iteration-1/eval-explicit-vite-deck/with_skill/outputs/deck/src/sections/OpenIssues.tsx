/**
 * Open-issues slide. Both annotations have `resolved: false`, so both
 * appear, stacked. If the stage cannot fit them both, the Presenter's
 * auto-pagination splits them into vertical sub-pages automatically.
 *
 * Annotation text is quoted verbatim from world.entities[*].metadata.text.
 */

interface OpenIssue {
  subId: string
  eyebrow: string
  title: string
  annotationId: string
  text: string
  touches: { id: string; title: string; exists: boolean }[]
}

const issues: OpenIssue[] = [
  {
    subId: 'naming',
    eyebrow: '§04a · Open issue',
    title: 'Billing owns pricing — move it to orders',
    annotationId: 'annotation_naming',
    text: 'We agreed at standup that the billing service should not own pricing — move pricing-related endpoints to orders next sprint.',
    touches: [
      { id: 'svc_billing', title: 'Billing Service', exists: true },
      { id: 'svc_orders', title: 'Orders Service', exists: true },
    ],
  },
  {
    subId: 'warehouse',
    eyebrow: '§04b · Open issue',
    title: 'Warehouse retention — legal sign-off',
    annotationId: 'annotation_warehouse',
    text: 'Warehouse retention is 90 days — flag this in the deck so legal can sign off.',
    touches: [
      { id: 'warehouse_orders', title: 'Orders Warehouse', exists: true },
    ],
  },
]

function IssueCard({ issue }: { issue: OpenIssue }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div className="eyebrow">{issue.eyebrow}</div>
      <h2 className="h2">{issue.title}</h2>

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
            marginBottom: '8px',
          }}
        >
          USER ANNOTATION · {issue.annotationId}
        </div>
        <div style={{ fontSize: '17px', lineHeight: 1.7 }}>
          “{issue.text}”
        </div>
      </div>

      <div className="card">
        <div className="card-title">Touches</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {issue.touches.map((t) => (
            <span
              key={t.id}
              className="tag"
              title={t.id}
              style={t.exists ? undefined : { opacity: 0.5 }}
            >
              {t.title}
              {!t.exists && ' (deleted)'}
            </span>
          ))}
        </div>
        <div className="card-body mono" style={{ fontSize: '12px', marginTop: '8px' }}>
          {issue.touches.map((t) => t.id).join(' · ')}
        </div>
      </div>
    </div>
  )
}

export function OpenIssues() {
  return (
    <section className="section">
      <div className="eyebrow">§04 · Open issues</div>
      <h2 className="h2">Two unresolved annotations</h2>
      <p className="lede">
        Both flags are still open on the canvas. Each one needs a decision
        before the next sprint plan.
      </p>
      {issues.map((issue) => (
        <IssueCard key={issue.subId} issue={issue} />
      ))}
    </section>
  )
}
