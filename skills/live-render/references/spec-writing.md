# Live Render — Spec Writing Reference

The workspace renders whatever is in `src/spec.json`. Write to that file and Vite HMR picks it up instantly.

## Spec format

```json
{
  "root": "root",
  "elements": {
    "root": { "type": "Stack", "props": { "direction": "vertical", "gap": "lg" }, "children": ["h1", "body"] },
    "h1":   { "type": "Heading", "props": { "text": "React Reconciliation", "level": "h1" }, "children": [] },
    "body": { "type": "ConceptPanel", "props": { "title": "What is reconciliation?", "description": "..." }, "children": [] }
  }
}
```

Rules:
- `root` must be a key in `elements`
- Every key in `children` must exist in `elements`
- `props` values must match the component's Zod schema (see `catalog-prompt.md`)
- Optional: `"state": { "/someKey": "initialValue" }` for interactive specs

## Which component to use

| Intent | Component |
|--------|-----------|
| Define a concept | `ConceptPanel` |
| Walk through steps | `StepList` |
| Compare options | `CompareGrid` |
| Show a timeline | `Timeline` |
| Familiar → unfamiliar | `AnalogyCard` |
| Before/after | `BeforeAfter` |
| Explain code | `CodeWalkthrough` |
| Define terms | `KeyTermList` |
| Knowledge check | `Quiz` |
| Long prose | `Markdown` |
| Key-value data | `PropertyTable` |
| Callout / tip / warning | `CalloutCard` |
| Section separator | `SectionHeader` |
| Node-edge graph | `FlowDiagram` |
| Message flow | `SequenceDiagram` |
| Parent-child hierarchy | `TreeDiagram` |
| Animated simulation | `Sketch` |
| Any standard UI | shadcn 36 (Card, Stack, Tabs, etc.) |

## Layout patterns

**Vertical scroll layout (most common):**
```json
{
  "root": "root",
  "elements": {
    "root": { "type": "Stack", "props": { "direction": "vertical", "gap": "xl" }, "children": ["s1", "s2", "s3"] },
    "s1": { "type": "SectionHeader", "props": { "label": "Overview" }, "children": [] },
    "s2": { "type": "ConceptPanel", "props": { "title": "...", "description": "..." }, "children": [] },
    "s3": { "type": "CalloutCard", "props": { "kind": "tip", "body": "..." }, "children": [] }
  }
}
```

**Two-column grid:**
```json
"root": { "type": "Grid", "props": { "columns": 2, "gap": "md" }, "children": ["left", "right"] }
```

**Tabbed content:**
```json
"root": {
  "type": "Tabs",
  "props": { "tabs": [{"label": "Overview", "value": "a"}, {"label": "Details", "value": "b"}], "defaultValue": "a" },
  "children": ["panel-a", "panel-b"]
}
```

## Dynamic specs (state)

Add a `state` top-level key and reference it with `$bindState` / `$state`:

```json
{
  "root": "root",
  "state": { "selected": null },
  "elements": {
    "root": { "type": "Stack", "props": { "direction": "vertical", "gap": "md" }, "children": ["q", "reveal"] },
    "q": {
      "type": "ButtonGroup",
      "props": {
        "buttons": [{"label": "A", "value": "a"}, {"label": "B", "value": "b"}],
        "selected": { "$bindState": "/selected" }
      },
      "children": []
    },
    "reveal": {
      "type": "CalloutCard",
      "props": { "kind": "tip", "body": "B is correct." },
      "visible": { "$state": "/selected", "eq": "b" },
      "children": []
    }
  }
}
```

Built-in actions (no catalog setup needed):
- `{ "action": "setState", "params": { "statePath": "/x", "value": 1 } }`
- `{ "action": "pushState", "params": { "statePath": "/items", "value": "new" } }`
- `{ "action": "removeState", "params": { "statePath": "/items", "index": 0 } }`

## Editing an existing spec

**Surgical edit** (change one prop): use the `Edit` tool targeting `src/spec.json`.

**Full rewrite**: use the `Write` tool to replace `src/spec.json` completely.

**JSON Patch** (for large specs, change one element): the spec format is JSON, so Edit tool can target a specific key in `elements` by its string content.

## Spec validation

After writing, run:
```bash
node -e "
const spec = JSON.parse(require('fs').readFileSync('src/spec.json', 'utf8'));
const keys = new Set(Object.keys(spec.elements));
const missing = Object.values(spec.elements)
  .flatMap(e => e.children ?? [])
  .filter(k => !keys.has(k));
if (missing.length) console.error('Missing child keys:', missing);
else console.log('Spec valid');
"
```

## Key constraints

- Element keys must be unique within `elements`
- `children` arrays reference keys, not nested objects
- Visible conditions use JSON Pointer paths (`/key`, not `.key`)
- `$bindState` goes on the component's natural value prop (`value`, `checked`, `pressed`)
- Component names are case-sensitive and must match the catalog exactly
