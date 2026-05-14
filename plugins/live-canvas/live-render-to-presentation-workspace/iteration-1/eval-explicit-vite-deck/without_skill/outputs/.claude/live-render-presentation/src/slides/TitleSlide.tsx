import type { World } from '../types'

interface Props {
  world: World
  regionCount: number
  openIssueCount: number
}

export const TitleSlide = ({ world, regionCount, openIssueCount }: Props) => {
  const created = new Date(world.metadata.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return (
    <section className="slide">
      <div className="slide__eyebrow">Live-render export</div>
      <h1 className="slide__title">{world.metadata.title}</h1>
      <p className="slide__subtitle">
        Generated from the live-render workspace canvas. {regionCount} region
        {regionCount === 1 ? '' : 's'} mapped, {openIssueCount} open issue
        {openIssueCount === 1 ? '' : 's'} to triage.
      </p>
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="card__kind">Snapshot</div>
        <div>
          <strong>Created:</strong> {created}
        </div>
        <div>
          <strong>Entities:</strong> {Object.keys(world.entities).length}
        </div>
      </div>
    </section>
  )
}
