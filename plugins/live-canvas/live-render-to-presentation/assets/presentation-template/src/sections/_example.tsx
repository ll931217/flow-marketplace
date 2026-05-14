/**
 * DELETE THIS FILE before shipping.
 *
 * It exists only as a styling cheat-sheet. Every authored section should
 * compose the same vocabulary (eyebrow + h1/h2 + lede + card + tag) so
 * the deck reads consistently. See references/section-patterns.md in the
 * skill for more shapes.
 */
export function Example() {
  return (
    <section className="section">
      <div className="eyebrow">§00 · Replace me</div>
      <h1 className="h1">
        Section <span style={{ color: 'var(--accent)' }}>title</span>
      </h1>
      <p className="lede">
        One-paragraph hook. Keep it under three lines on a 1100px stage.
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span className="tag tag-accent">tag accent</span>
        <span className="tag">tag muted</span>
      </div>

      <div className="grid-2" style={{ marginTop: '8px' }}>
        <div className="card">
          <div className="card-title">card title</div>
          <div className="card-body">
            Card body copy. Sentence-case. No emoji unless the user asked
            for them.
          </div>
        </div>
        <div className="card">
          <div className="card-title mono">mono card</div>
          <div className="card-body mono" style={{ fontSize: '12px' }}>
            Useful for entity IDs, paths, code-like values.
          </div>
        </div>
      </div>
    </section>
  )
}
