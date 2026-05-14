import { useEffect, useMemo, useState, type ReactNode } from 'react'
import worldData from './world.json'
import type { World } from './types'
import {
  annotationsForRegion,
  edgesForNodes,
  nodesInRegion,
  partitionEntities,
  unresolvedAnnotations,
} from './derive'
import { TitleSlide } from './slides/TitleSlide'
import { RegionSlide } from './slides/RegionSlide'
import { OpenIssuesSlide } from './slides/OpenIssuesSlide'

const world = worldData as unknown as World

export const App = () => {
  const { regions, nodes, edges, annotations } = useMemo(
    () => partitionEntities(world),
    [],
  )
  const openIssues = useMemo(() => unresolvedAnnotations(annotations), [annotations])

  const slides = useMemo(() => {
    const built: Array<{ key: string; node: ReactNode }> = []
    built.push({
      key: 'title',
      node: (
        <TitleSlide
          world={world}
          regionCount={regions.length}
          openIssueCount={openIssues.length}
        />
      ),
    })
    regions.forEach((region, idx) => {
      const regionNodes = nodesInRegion(region, nodes)
      const nodeIds = new Set(regionNodes.map((n) => n.id))
      const regionEdges = edgesForNodes(nodeIds, edges)
      const regionAnnotations = annotationsForRegion(region, annotations, nodeIds)
      built.push({
        key: region.id,
        node: (
          <RegionSlide
            region={region}
            nodes={regionNodes}
            edges={regionEdges}
            annotations={regionAnnotations}
            index={idx + 1}
            total={regions.length}
          />
        ),
      })
    })
    built.push({
      key: 'open-issues',
      node: <OpenIssuesSlide annotations={openIssues} entities={world.entities} />,
    })
    return built
  }, [regions, nodes, edges, annotations, openIssues])

  const [index, setIndex] = useState(0)
  const clamp = (i: number) => Math.max(0, Math.min(slides.length - 1, i))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        setIndex((i) => clamp(i + 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setIndex((i) => clamp(i - 1))
      } else if (e.key === 'Home') {
        setIndex(0)
      } else if (e.key === 'End') {
        setIndex(slides.length - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length])

  const current = slides[index]

  return (
    <div className="deck">
      {current.node}
      <nav className="deck__nav" aria-label="Slide navigation">
        <button
          onClick={() => setIndex((i) => clamp(i - 1))}
          disabled={index === 0}
        >
          ← Prev
        </button>
        <div className="deck__dots" aria-hidden>
          {slides.map((s, i) => (
            <span
              key={s.key}
              className={`deck__dot ${i === index ? 'deck__dot--active' : ''}`}
            />
          ))}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>
          {index + 1} / {slides.length}
        </div>
        <button
          onClick={() => setIndex((i) => clamp(i + 1))}
          disabled={index === slides.length - 1}
        >
          Next →
        </button>
      </nav>
    </div>
  )
}
