# Live Render — Component Patterns Reference

> **Superseded by the new catalog-backed system.**
>
> The per-session custom component workflow (`src/components/custom/`) has been replaced.
> All components are now pre-shipped in the frozen catalog.
>
> - To write specs against the catalog → see `references/spec-writing.md`
> - To add a new component to the catalog → see `references/catalog-extension.md`
> - Component prop schemas and descriptions → see `references/catalog-prompt.md`
> - Anime.js animation patterns → still applicable; documented below

## Animations with anime.js

These timing recipes still work — apply them to any element rendered by the catalog.

### Staggered Entrance

```ts
import anime from 'animejs'

export function staggerEntrance(selector: string) {
  anime({
    targets: selector,
    opacity: [0, 1],
    translateY: [16, 0],
    duration: 400,
    delay: anime.stagger(80),
    easing: 'easeOutExpo',
  })
}
```

### Highlight / Pulse

```ts
export function pulseElement(el: HTMLElement | SVGElement) {
  anime({
    targets: el,
    scale: [1, 1.05, 1],
    duration: 600,
    easing: 'easeInOutSine',
  })
}
```

### State Transition

```ts
export function transitionIn(selector: string) {
  anime({
    targets: selector,
    opacity: [0, 1],
    scale: [0.96, 1],
    duration: 300,
    easing: 'easeOutQuart',
  })
}
```

### Timeline: Sequential Storytelling

```ts
export function buildTimeline() {
  return anime.timeline({ easing: 'easeOutExpo' })
    .add({ targets: '#step-1', opacity: [0, 1], translateX: [-20, 0], duration: 400 })
    .add({ targets: '#step-2', opacity: [0, 1], translateX: [-20, 0], duration: 400 }, '+=200')
    .add({ targets: '#step-3', opacity: [0, 1], translateX: [-20, 0], duration: 400 }, '+=200')
}
```
