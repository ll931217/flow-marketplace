import type p5 from 'p5'

type SketchFactory = (sk: p5, params: Record<string, unknown>) => void

// ── force-graph ────────────────────────────────────────────────────────────

const forceGraph: SketchFactory = (sk, params) => {
  const n = (params.nodes as number | undefined) ?? 20
  const k = (params.spring as number | undefined) ?? 0.01
  const repel = (params.repel as number | undefined) ?? 1200

  interface Particle { x: number; y: number; vx: number; vy: number }
  let pts: Particle[] = []
  let edges: [number, number][] = []

  sk.setup = () => {
    sk.createCanvas(sk.windowWidth, sk.height || 360)
    sk.colorMode(sk.RGB, 255)
    pts = Array.from({ length: n }, () => ({
      x: sk.random(sk.width), y: sk.random(sk.height),
      vx: 0, vy: 0,
    }))
    edges = Array.from({ length: Math.floor(n * 1.4) }, () => [
      Math.floor(sk.random(n)), Math.floor(sk.random(n)),
    ] as [number, number])
  }

  sk.draw = () => {
    sk.background(13, 17, 23, 230)
    for (const [a, b] of edges) {
      const pa = pts[a], pb = pts[b]
      if (!pa || !pb) continue
      sk.stroke(99, 102, 241, 80)
      sk.strokeWeight(1)
      sk.line(pa.x, pa.y, pb.x, pb.y)
      const dx = pb.x - pa.x, dy = pb.y - pa.y
      pa.vx += dx * k; pa.vy += dy * k
      pb.vx -= dx * k; pb.vy -= dy * k
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const pi = pts[i], pj = pts[j]
        if (!pi || !pj) continue
        const dx = pj.x - pi.x, dy = pj.y - pi.y
        const d2 = dx * dx + dy * dy + 1
        const f = repel / d2
        pi.vx -= (dx * f); pi.vy -= (dy * f)
        pj.vx += (dx * f); pj.vy += (dy * f)
      }
    }
    for (const p of pts) {
      p.vx *= 0.9; p.vy *= 0.9
      p.x = sk.constrain(p.x + p.vx, 0, sk.width)
      p.y = sk.constrain(p.y + p.vy, 0, sk.height)
      sk.noStroke()
      sk.fill(99, 102, 241)
      sk.circle(p.x, p.y, 6)
    }
  }
}

// ── particles ─────────────────────────────────────────────────────────────

const particles: SketchFactory = (sk, params) => {
  const count = (params.count as number | undefined) ?? 80
  interface Pt { x: number; y: number; vx: number; vy: number; life: number }
  let pts: Pt[] = []

  sk.setup = () => {
    sk.createCanvas(sk.windowWidth, sk.height || 360)
    sk.colorMode(sk.HSB, 360, 100, 100, 100)
  }

  sk.draw = () => {
    sk.background(220, 20, 8, 25)
    while (pts.length < count) {
      pts.push({ x: sk.width / 2, y: sk.height / 2,
        vx: sk.random(-2, 2), vy: sk.random(-3, -0.5), life: sk.random(80, 160) })
    }
    pts = pts.filter((p) => {
      p.x += p.vx; p.y += p.vy; p.life--
      const alpha = (p.life / 160) * 80
      sk.fill(200 + sk.noise(p.x / 200, p.y / 200) * 60, 70, 90, alpha)
      sk.noStroke()
      sk.circle(p.x, p.y, 4)
      return p.life > 0
    })
  }
}

// ── wave ──────────────────────────────────────────────────────────────────

const wave: SketchFactory = (sk, params) => {
  const waves = (params.waves as number | undefined) ?? 3

  sk.setup = () => {
    sk.createCanvas(sk.windowWidth, sk.height || 360)
    sk.colorMode(sk.RGB, 255)
  }

  sk.draw = () => {
    sk.background(13, 17, 23)
    for (let w = 0; w < waves; w++) {
      const phase = (sk.frameCount / 60) * (1 + w * 0.4) * sk.TWO_PI
      const amp = sk.height * 0.12 * (1 - w * 0.2)
      const hue = [99, 102, 241, 74, 222, 128, 251, 191, 36][w * 3]
      sk.stroke(hue ?? 99, 102, 241, 160)
      sk.strokeWeight(1.5)
      sk.noFill()
      sk.beginShape()
      for (let x = 0; x <= sk.width; x += 4) {
        const y = sk.height / 2 + Math.sin(x / 60 + phase) * amp
        sk.curveVertex(x, y)
      }
      sk.endShape()
    }
  }
}

// ── gradient-field ────────────────────────────────────────────────────────

const gradientField: SketchFactory = (sk, params) => {
  const res = (params.resolution as number | undefined) ?? 20

  sk.setup = () => {
    sk.createCanvas(sk.windowWidth, sk.height || 360)
    sk.colorMode(sk.HSB, 360, 100, 100, 100)
    sk.noLoop()
  }

  sk.draw = () => {
    sk.background(220, 20, 8)
    const cols = Math.ceil(sk.width / res)
    const rows = Math.ceil(sk.height / res)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * res + res / 2
        const y = r * res + res / 2
        const angle = sk.noise(c / 5, r / 5, sk.frameCount / 60) * sk.TWO_PI * 2
        const hue = (angle / (sk.TWO_PI * 2)) * 360
        sk.stroke(hue, 70, 90, 90)
        sk.strokeWeight(1.5)
        sk.push()
        sk.translate(x, y)
        sk.rotate(angle)
        sk.line(-res / 3, 0, res / 3, 0)
        sk.pop()
      }
    }
  }
}

export const sketches: Record<string, SketchFactory> = {
  'force-graph':    forceGraph,
  'particles':      particles,
  'wave':           wave,
  'gradient-field': gradientField,
}
