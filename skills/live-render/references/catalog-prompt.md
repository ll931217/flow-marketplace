# Catalog Reference — Live Render

> Read this at the start of every session before writing `src/spec.json`.
> Derived from the frozen catalog in `src/catalog.ts`.

## Spec format

```json
{
  "root": "<root-element-key>",
  "elements": {
    "<key>": { "type": "<ComponentName>", "props": { ... }, "children": ["<child-key>", ...] }
  },
  "state": { "/path": <initial-value> }
}
```

Every `children` key must exist in `elements`. Optional keys: `visible`, `on`, `watch`, `repeat`.

## Built-in actions (no catalog setup needed)

| Action | Params |
|--------|--------|
| `setState` | `{ statePath: "/path", value: <any> }` |
| `pushState` | `{ statePath: "/path", value: <any> }` |
| `removeState` | `{ statePath: "/path", index: <number> }` |
| `validateForm` | `{ statePath?: "/path" }` |

## Dynamic prop expressions

| Expression | Effect |
|-----------|--------|
| `{ "$state": "/path" }` | one-way read |
| `{ "$bindState": "/path" }` | two-way binding (use on value/checked/pressed) |
| `{ "$template": "Hello, ${/name}!" }` | string interpolation |
| `{ "$cond": <cond>, "$then": <v>, "$else": <v> }` | conditional value |

---

## shadcn components

### Layout
- **Stack** — flex container. Props: `direction?: "horizontal"|"vertical"`, `gap?: "none"|"sm"|"md"|"lg"|"xl"`, `align?`, `justify?`
- **Grid** — CSS grid. Props: `columns?: number`, `gap?: "sm"|"md"|"lg"|"xl"`
- **Card** — container card. Props: `title?: string`, `description?: string`, `maxWidth?: "sm"|"md"|"lg"|"full"`, `centered?: boolean`. Slots: `default`
- **Separator** — divider. Props: `orientation?: "horizontal"|"vertical"`

### Navigation
- **Tabs** — tabbed nav. Props: `tabs: [{label, value}]`, `defaultValue?: string`, `value?: string`. Slots: tab values as slot names. Events: `change`
- **Accordion** — collapsible items. Props: `items: [{title, content}]`, `type?: "single"|"multiple"`
- **Collapsible** — single toggle. Props: `title: string`, `defaultOpen?: boolean`. Slots: `default`
- **Pagination** — page nav. Props: `totalPages: number`, `page?: number`. Events: `change`

### Overlay
- **Dialog** — modal. Props: `title: string`, `description?: string`, `openPath: string`. Slots: `default`
- **Drawer** — bottom sheet. Props: `title: string`, `description?: string`, `openPath: string`. Slots: `default`
- **Tooltip** — hover tooltip. Props: `content: string`, `text: string`
- **Popover** — click popover. Props: `trigger: string`, `content: string`
- **DropdownMenu** — dropdown. Props: `label: string`, `items: [{label, value}]`, `value?: string`. Events: `change`

### Content
- **Heading** — heading text. Props: `text: string`, `level?: "h1"|"h2"|"h3"|"h4"`
- **Text** — paragraph. Props: `text: string`, `variant?: "body"|"caption"|"muted"|"lead"|"code"`
- **Badge** — status chip. Props: `text: string`, `variant?: "default"|"secondary"|"destructive"|"outline"`
- **Alert** — banner. Props: `title: string`, `message?: string`, `type?: "success"|"info"|"warning"|"error"`
- **Avatar** — user avatar. Props: `name: string`, `src?: string`, `size?: "sm"|"md"|"lg"`
- **Image** — image. Props: `alt: string`, `src?: string`, `width?: number`, `height?: number`
- **Table** — data table. Props: `columns: string[]`, `rows: string[][]`, `caption?: string`
- **Carousel** — scrollable items. Props: `items: [{title?, description?}]`
- **Progress** — progress bar. Props: `value: number`, `max?: number`, `label?: string`
- **Skeleton** — loading placeholder. Props: `width?: string`, `height?: string`, `rounded?: boolean`
- **Spinner** — loading spinner. Props: `size?: "sm"|"md"|"lg"`, `label?: string`

### Input
- **Button** — clickable. Props: `label: string`, `variant?: "primary"|"secondary"|"danger"`, `disabled?: boolean`. Events: `press`
- **Link** — anchor. Props: `label: string`, `href: string`. Events: `click`
- **Input** — text input. Props: `label: string`, `name: string`, `type?: "text"|"email"|"password"|"number"`, `placeholder?: string`, `value?: string`. Events: `change`, `blur`
- **Textarea** — multiline. Props: `label: string`, `name: string`, `placeholder?: string`, `rows?: number`, `value?: string`
- **Select** — dropdown. Props: `label: string`, `name: string`, `options: string[]`, `placeholder?: string`, `value?: string`. Events: `change`, `select`
- **Checkbox** — checkbox. Props: `label: string`, `name: string`, `checked?: boolean`. Events: `change`
- **Radio** — radio group. Props: `label: string`, `name: string`, `options: string[]`, `value?: string`. Events: `change`
- **Switch** — toggle. Props: `label: string`, `name: string`, `checked?: boolean`. Events: `change`
- **Slider** — range. Props: `label?: string`, `min?: number`, `max?: number`, `step?: number`, `value?: number`. Events: `change`
- **Toggle** — toggle button. Props: `label: string`, `pressed?: boolean`, `variant?: "default"|"outline"`. Events: `change`
- **ToggleGroup** — toggle group. Props: `items: [{label, value}]`, `type?: "single"|"multiple"`, `value?: string`. Events: `change`
- **ButtonGroup** — segmented buttons. Props: `buttons: [{label, value}]`, `selected?: string`. Events: `change`

---

## Explainer components

### ConceptPanel
Titled concept card. Use for defining a concept or framing a topic.
```json
{ "type": "ConceptPanel", "props": { "title": "...", "description": "...", "badge": "optional", "accent": false } }
```

### StepList
Ordered steps with status. Use for workflows, algorithms, how-tos.
```json
{ "type": "StepList", "props": { "steps": [{ "label": "...", "detail": "optional", "status": "pending|active|done" }] } }
```

### PropertyTable
Key-value pairs. Use for attributes, config, API fields.
```json
{ "type": "PropertyTable", "props": { "title": "optional", "rows": [{ "key": "...", "value": "..." }] } }
```

### CalloutCard
Highlighted callout. Use for tips, warnings, critical insights.
```json
{ "type": "CalloutCard", "props": { "kind": "info|warning|tip|danger", "title": "optional", "body": "..." } }
```

### SectionHeader
Section divider. Use to label major canvas sections.
```json
{ "type": "SectionHeader", "props": { "label": "...", "subtitle": "optional" } }
```

### CompareGrid
Side-by-side comparison with pros/cons. Use when choosing between options.
```json
{ "type": "CompareGrid", "props": { "options": [{ "name": "...", "pros": ["..."], "cons": ["..."], "recommended": false }] } }
```

### Timeline
Vertical chronological events. Use for history, roadmaps, migration steps.
```json
{ "type": "Timeline", "props": { "events": [{ "when": "...", "title": "...", "body": "optional" }] } }
```

### AnalogyCard
Familiar → unfamiliar mapping. Use when introducing new concepts via analogy.
```json
{ "type": "AnalogyCard", "props": { "familiar": "...", "unfamiliar": "...", "mapping": "..." } }
```

### BeforeAfter
Two-panel comparison. Use for refactoring, config changes, redesigns.
```json
{ "type": "BeforeAfter", "props": { "before": { "label": "...", "body": "..." }, "after": { "label": "...", "body": "..." } } }
```

### CodeWalkthrough
Annotated code with per-line notes. Use for explaining logic step-by-step.
```json
{
  "type": "CodeWalkthrough",
  "props": {
    "language": "typescript",
    "lines": [{ "code": "const x = 1", "note": "optional note", "highlight": false }]
  }
}
```

### KeyTermList
Glossary. Use for domain vocabulary, acronyms, related concepts.
```json
{ "type": "KeyTermList", "props": { "terms": [{ "term": "...", "definition": "..." }] } }
```

### Quiz
Multiple-choice question. Use for comprehension checks and misconception exploration.
```json
{ "type": "Quiz", "props": { "question": "...", "options": ["A", "B", "C"], "correctIndex": 1, "explanation": "optional" } }
```

### Markdown
Rich prose. Use for multi-paragraph explanations, GFM tables/lists.
```json
{ "type": "Markdown", "props": { "content": "# Heading\n\nParagraph with **bold** and `code`." } }
```

---

## Diagram components

### FlowDiagram
Interactive React Flow node-graph. Use for DAGs, architectures, state machines.
```json
{
  "type": "FlowDiagram",
  "props": {
    "nodes": [{ "id": "a", "label": "Start", "x": 50, "y": 50, "kind": "input" }],
    "edges": [{ "from": "a", "to": "b", "label": "optional", "animated": false }],
    "height": 400
  }
}
```
Node kinds: `default`, `input`, `output`, `process`, `decision`, `storage`, `external`

### SequenceDiagram
SVG sequence diagram. Use for request/response flows, auth, protocols.
```json
{
  "type": "SequenceDiagram",
  "props": {
    "actors": ["Client", "Server", "DB"],
    "messages": [{ "from": "Client", "to": "Server", "label": "GET /data", "kind": "sync" }]
  }
}
```
Message kinds: `sync` (solid arrow), `async` (dashed), `return` (dashed back), `note` (highlight box)

### TreeDiagram
SVG hierarchical tree. Use for org charts, file trees, class hierarchies.
```json
{
  "type": "TreeDiagram",
  "props": {
    "root": { "label": "Root", "children": [{ "label": "Child A" }, { "label": "Child B" }] }
  }
}
```

### Sketch
p5.js animation. Use for particle systems, force graphs, waveforms, generative art.
```json
{ "type": "Sketch", "props": { "sketchId": "force-graph|particles|wave|gradient-field", "params": {}, "height": 360 } }
```

Sketch params:
- `force-graph`: `nodes` (int, default 20), `spring` (float, default 0.01), `repel` (int, default 1200)
- `particles`: `count` (int, default 80)
- `wave`: `waves` (int, default 3)
- `gradient-field`: `resolution` (int, default 20)
