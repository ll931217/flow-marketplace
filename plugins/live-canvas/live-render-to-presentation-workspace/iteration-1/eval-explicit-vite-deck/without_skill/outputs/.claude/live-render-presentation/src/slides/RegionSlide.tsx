import type {
  AnnotationEntity,
  EdgeEntity,
  NodeEntity,
  RegionEntity,
} from '../types'

interface Props {
  region: RegionEntity
  nodes: NodeEntity[]
  edges: EdgeEntity[]
  annotations: AnnotationEntity[]
  index: number
  total: number
}

export const RegionSlide = ({
  region,
  nodes,
  edges,
  annotations,
  index,
  total,
}: Props) => {
  const accent = region.metadata.accent ?? 'var(--accent)'
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  return (
    <section className="slide">
      <div className="accent-bar" style={{ background: accent }} />
      <div className="slide__eyebrow">
        Region {index} of {total}
      </div>
      <h1 className="slide__title">{region.metadata.title}</h1>
      {region.metadata.description ? (
        <p className="slide__subtitle">{region.metadata.description}</p>
      ) : null}

      <div className="slide__body">
        <div>
          <div className="card__kind" style={{ marginBottom: 12 }}>
            Components ({nodes.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {nodes.map((n) => (
              <div
                key={n.id}
                className="card"
                style={{ borderLeft: `4px solid ${n.metadata.accent ?? accent}` }}
              >
                <div className="card__head">
                  {n.metadata.icon ? (
                    <span className="card__icon">{n.metadata.icon}</span>
                  ) : null}
                  <span>{n.metadata.title}</span>
                </div>
                {n.metadata.kind ? (
                  <div className="card__kind">{n.metadata.kind}</div>
                ) : null}
              </div>
            ))}
            {nodes.length === 0 ? (
              <div className="card__kind">No components in this region.</div>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div className="card__kind" style={{ marginBottom: 12 }}>
              Connections ({edges.length})
            </div>
            <div className="edges">
              {edges.map((e) => {
                const from = nodeById.get(e.metadata.from)
                const to = nodeById.get(e.metadata.to)
                return (
                  <div key={e.id} className="edge">
                    <span>{from?.metadata.title ?? e.metadata.from}</span>
                    <span className="edge__arrow">→</span>
                    <span>{to?.metadata.title ?? e.metadata.to}</span>
                    {e.metadata.label ? (
                      <span className="edge__label">{e.metadata.label}</span>
                    ) : null}
                  </div>
                )
              })}
              {edges.length === 0 ? (
                <div className="card__kind">No connections involve this region.</div>
              ) : null}
            </div>
          </div>

          {annotations.length > 0 ? (
            <div>
              <div className="card__kind" style={{ marginBottom: 12 }}>
                Notes ({annotations.length})
              </div>
              <div className="issues-list">
                {annotations.map((a) => (
                  <div key={a.id} className="issue">
                    <p className="issue__text">{a.metadata.text}</p>
                    <div className="issue__meta">
                      <span className="chip">
                        {a.metadata.resolved ? 'Resolved' : 'Open'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
