import type { AnnotationEntity, Entity } from '../types'

interface Props {
  annotations: AnnotationEntity[]
  entities: Record<string, Entity>
}

const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

const entityTitle = (entity: Entity | undefined): string => {
  if (!entity) return 'unknown'
  const meta = entity.metadata as { title?: string }
  return meta.title ?? entity.id
}

export const OpenIssuesSlide = ({ annotations, entities }: Props) => {
  return (
    <section className="slide">
      <div className="accent-bar" style={{ background: 'var(--warn)' }} />
      <div className="slide__eyebrow">Open issues</div>
      <h1 className="slide__title">Unresolved annotations</h1>
      <p className="slide__subtitle">
        {annotations.length === 0
          ? 'No open issues. Everything is resolved.'
          : `${annotations.length} unresolved note${annotations.length === 1 ? '' : 's'} pulled from the canvas — these need follow-up before sign-off.`}
      </p>

      <div className="issues-list">
        {annotations.map((a) => {
          const enclosed = a.metadata.enclosedEntityIds
            .map((id) => entityTitle(entities[id]))
            .filter(Boolean)
          return (
            <div key={a.id} className="issue">
              <p className="issue__text">{a.metadata.text}</p>
              <div className="issue__meta">
                <span className="chip">Open</span>
                <span>Raised {formatDate(a.metadata.createdAt)}</span>
                {enclosed.length > 0 ? (
                  <span>Affects: {enclosed.join(', ')}</span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
