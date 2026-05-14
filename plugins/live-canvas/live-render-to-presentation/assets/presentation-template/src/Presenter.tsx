import { useState, useEffect, useRef, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'

export interface Subsection {
  id: string
  node: ReactNode
}

export interface Slide {
  id: string
  label: string
  /** Either a single node (auto-paginates if it overflows) or an explicit list of subsections (each becomes its own vertical sub-page). */
  node?: ReactNode
  subsections?: Subsection[]
}

interface PresenterProps {
  slides: Slide[]
  onExit: () => void
}

/**
 * SlideHost owns the measurement lifecycle for a single slide.
 * It mounts when the slide actually enters the DOM (after AnimatePresence's
 * exit animation completes) and unmounts when the slide leaves — so refs are
 * always valid when its useEffect runs. Reports page count and stage height
 * back to the parent via a callback held in a ref (avoids stale closures).
 */
interface SlideHostProps {
  slide: Slide
  subIndex: number
  onMetrics: (pages: number, stageHeight: number) => void
}

function SlideHost({ slide, subIndex, onMetrics }: SlideHostProps) {
  if (slide.subsections && slide.subsections.length > 0) {
    return <SubsectionHost slide={slide} subIndex={subIndex} onMetrics={onMetrics} />
  }
  return <AutoPaginatedHost subIndex={subIndex} onMetrics={onMetrics}>{slide.node}</AutoPaginatedHost>
}

/**
 * Explicit subsections: each subsection is its own slide-within-slide.
 * Only the current subsection is rendered, animated vertically via AnimatePresence.
 * No measurement needed — page count is the subsection array length.
 */
function SubsectionHost({ slide, subIndex, onMetrics }: SlideHostProps) {
  const subsections = slide.subsections!
  const onMetricsRef = useRef(onMetrics)
  const prevSubIndex = useRef(subIndex)

  useEffect(() => {
    onMetricsRef.current = onMetrics
  }, [onMetrics])

  useEffect(() => {
    onMetricsRef.current?.(subsections.length, 0)
  }, [subsections.length])

  const direction = subIndex >= prevSubIndex.current ? 1 : -1
  useEffect(() => {
    prevSubIndex.current = subIndex
  }, [subIndex])

  const safeIndex = Math.max(0, Math.min(subsections.length - 1, subIndex))
  const current = subsections[safeIndex]

  return (
    <div className="present-stage">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: direction * 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: direction * -24 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="present-content"
        >
          <div className="present-content-inner">{current.node}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

interface AutoPagedProps {
  children: ReactNode
  subIndex: number
  onMetrics: (pages: number, stageHeight: number) => void
}

/**
 * Auto-pagination: measures content height vs stage height and paginates
 * by translating the content upward by viewport-sized chunks. Used when a
 * slide doesn't declare explicit subsections.
 */
function AutoPaginatedHost({ children, subIndex, onMetrics }: AutoPagedProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const onMetricsRef = useRef(onMetrics)
  const [stageHeight, setStageHeight] = useState(0)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    onMetricsRef.current = onMetrics
  }, [onMetrics])

  useEffect(() => {
    const stage = stageRef.current
    const content = contentRef.current
    if (!stage || !content) return

    let lastPages = -1
    let lastStageHeight = -1

    const measure = () => {
      const sh = stage.clientHeight
      const ch = content.scrollHeight
      if (sh === 0) return
      const p = Math.max(1, Math.ceil(ch / sh))
      if (p !== lastPages || sh !== lastStageHeight) {
        lastPages = p
        lastStageHeight = sh
        setPages(p)
        setStageHeight(sh)
        onMetricsRef.current?.(p, sh)
      }
    }

    measure()
    const raf = requestAnimationFrame(measure)
    const ro = new ResizeObserver(measure)
    ro.observe(content)
    ro.observe(stage)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const clampedSub = Math.min(subIndex, Math.max(0, pages - 1))

  return (
    <div ref={stageRef} className="present-stage">
      <motion.div
        ref={contentRef}
        className="present-content"
        animate={{ y: -clampedSub * stageHeight }}
        transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="present-content-inner">{children}</div>
      </motion.div>
    </div>
  )
}

export function Presenter({ slides, onExit }: PresenterProps) {
  const [index, setIndex] = useState(() => {
    const fromHash = window.location.hash.replace('#', '')
    const found = slides.findIndex((s) => s.id === fromHash)
    return found >= 0 ? found : 0
  })
  const [subIndex, setSubIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [pages, setPages] = useState(1)

  // Reset sub-index whenever the slide changes
  useEffect(() => {
    setSubIndex(0)
  }, [index])

  // Clamp sub-index if pages shrinks (e.g., viewport resized larger)
  useEffect(() => {
    setSubIndex((s) => (s >= pages ? Math.max(0, pages - 1) : s))
  }, [pages])

  const handleMetrics = (p: number, _h: number) => {
    setPages(p)
  }

  const goSlide = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, nextIndex))
    if (clamped === index) return
    setDirection(clamped > index ? 1 : -1)
    setIndex(clamped)
  }

  // Smart advance: vertical first, then horizontal
  const advance = () => {
    if (subIndex < pages - 1) {
      setSubIndex(subIndex + 1)
    } else if (index < slides.length - 1) {
      goSlide(index + 1)
    }
  }

  const retreat = () => {
    if (subIndex > 0) {
      setSubIndex(subIndex - 1)
    } else if (index > 0) {
      goSlide(index - 1)
    }
  }

  const goDown = () => {
    if (subIndex < pages - 1) setSubIndex(subIndex + 1)
  }
  const goUp = () => {
    if (subIndex > 0) setSubIndex(subIndex - 1)
  }

  useHotkeys('space,enter,pagedown,n', advance, [index, subIndex, pages])
  useHotkeys('shift+space,pageup,p', retreat, [index, subIndex, pages])
  useHotkeys('right,l', () => goSlide(index + 1), [index])
  useHotkeys('left,h', () => goSlide(index - 1), [index])
  useHotkeys('down,j', goDown, [subIndex, pages])
  useHotkeys('up,k', goUp, [subIndex])
  useHotkeys('home', () => goSlide(0))
  useHotkeys('end', () => goSlide(slides.length - 1), [slides.length])
  useHotkeys('escape', () => onExit())
  useHotkeys(
    '1,2,3,4,5,6,7,8,9',
    (e) => {
      const n = parseInt(e.key, 10)
      if (!Number.isNaN(n) && n >= 1 && n <= slides.length) {
        goSlide(n - 1)
      }
    },
    [slides.length, index],
  )

  useEffect(() => {
    const slide = slides[index]
    if (slide) {
      const url = new URL(window.location.href)
      url.searchParams.set('present', '1')
      window.history.replaceState(null, '', `${url.pathname}?${url.searchParams}#${slide.id}`)
    }
  }, [index, slides])

  const current = slides[index]
  const clampedSub = Math.min(subIndex, Math.max(0, pages - 1))

  return (
    <div className="present-root">
      <div className="present-frame">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="present-slide"
          >
            <SlideHost slide={current} subIndex={subIndex} onMetrics={handleMetrics} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="present-chrome">
        <button
          className="present-btn"
          onClick={retreat}
          disabled={index === 0 && subIndex === 0}
          aria-label="Previous"
          title="Previous (←/↑/Shift+Space)"
        >
          ←
        </button>

        <div className="present-dots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              className={`present-dot ${i === index ? 'is-active' : ''}`}
              onClick={() => goSlide(i)}
              title={s.label}
              aria-label={`Go to ${s.label}`}
            />
          ))}
        </div>

        {pages > 1 && (
          <div className="present-vdots" title={`Sub-page ${clampedSub + 1} of ${pages}`}>
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                className={`present-vdot ${i === clampedSub ? 'is-active' : ''}`}
                onClick={() => setSubIndex(i)}
                aria-label={`Sub-page ${i + 1}`}
              />
            ))}
          </div>
        )}

        <div className="present-counter mono">
          {String(index + 1).padStart(2, '0')}
          {pages > 1 && <span className="present-sub">·{clampedSub + 1}/{pages}</span>}
          {' '}/ {String(slides.length).padStart(2, '0')}
        </div>

        <button
          className="present-btn"
          onClick={advance}
          disabled={index === slides.length - 1 && subIndex === pages - 1}
          aria-label="Next"
          title="Next (→/↓/Space)"
        >
          →
        </button>

        <button
          className="present-exit mono"
          onClick={onExit}
          title="Exit present mode (Esc)"
        >
          ESC
        </button>
      </div>
    </div>
  )
}
