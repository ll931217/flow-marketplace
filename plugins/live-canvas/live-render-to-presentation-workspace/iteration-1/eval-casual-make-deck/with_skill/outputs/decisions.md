# Inferred decisions (headless run)

Skill workflow asks the user to confirm the narrative arc in Phase 2 and the
target directory in Phase 3. No human is available, so the following choices
were made from the world snapshot alone.

## World snapshot summary

- Title (from `world.metadata.title`): **Order Fulfilment Platform**
- Entities by type:
  - nodes: 6 (3 platform services, 3 data plane stores)
  - edges: 4
  - regions: 2 (`Platform services`, `Data plane`)
  - annotations: 2 (both `resolved: false`)
- Spatial membership (bounding-box centre containment):
  - `Platform services`: `svc_auth`, `svc_billing`, `svc_orders`
  - `Data plane`: `db_users`, `bus_ledger`, `warehouse_orders`
- No orphan nodes. No node sits inside both regions.

## Audience / framing

User said: "small architecture review tomorrow." Treat as an internal,
peer-engineer audience — assume familiarity with the domain, keep prose
short, lean on the canvas's own structure.

## Proposed deck (8 slides)

1. `00 · Title` — Order Fulfilment Platform / architecture review
2. `01 · Today` — entity tally + what we'll cover
3. `02 · Platform services` — region overview, three services as cards
4. `03 · Data plane` — region overview, three stores as cards
5. `04 · Wiring` — the four edges as an inline diagram
6. `05 · Open issue · Pricing ownership` — annotation_naming, verbatim
7. `06 · Open issue · Warehouse retention` — annotation_warehouse, verbatim
8. `07 · Next steps` — the two annotations restated as actions + Q&A

Annotations are both unresolved, so each gets its own callout slide rather
than being grouped. They land *after* the architecture slides so the team
has the model in their head before the open questions hit.

## Scaffold target

Default location per SKILL.md is
`<project_root>/.claude/live-render-presentation/`, but per the eval harness
the deliverable must live under `outputs/`. Final structure:

```
outputs/
  decisions.md
  live-render-presentation/      # the Vite app (copy of template + authored sections)
```

`_example.tsx` is deleted before shipping per SKILL.md Phase 3.
`Presenter.tsx`, `theme.css`, `Markdown.tsx`, `vite.config.ts`,
`tsconfig.json`, `main.tsx`, `package.json` are bundled assets — copied
verbatim, not edited (only `index.html`'s `<title>` is updated, which the
anatomy reference allows).

## Verification status

Per harness instructions: `pnpm install` is forbidden (no network) and
typecheck may be skipped. Source files are authored to match the template's
strict tsconfig (`noUnusedLocals`, `noUnusedParameters`, `strict`) by
inspection — no unused imports, every parameter consumed, every list item
has a stable `key`.
