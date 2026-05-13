import { JSONUIProvider, Renderer } from '@json-render/react'
import { registry } from './catalog'
import spec from './spec.json'
import type { Spec } from '@json-render/core'

export default function App() {
  return (
    <div className="canvas-root">
      <JSONUIProvider registry={registry}>
        <main className="canvas-main">
          <Renderer spec={spec as Spec} registry={registry} />
        </main>
      </JSONUIProvider>
    </div>
  )
}
