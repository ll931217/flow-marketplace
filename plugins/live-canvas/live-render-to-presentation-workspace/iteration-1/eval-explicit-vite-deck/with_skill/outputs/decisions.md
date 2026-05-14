# Decisions (headless run)

The harness is non-interactive, so all Phase-2 narrative questions are
answered here from the world snapshot + the explicit user request.

## Phase 1 — World source

- `GET /api/world` declared unavailable by the harness.
- Fell back to on-disk snapshot at
  `<project>/.claude/live-render-workspace/world.json`.
- Cached snapshot copy written to
  `outputs/workspace/.presentation/world-snapshot.json` for reproducibility.

## Phase 2 — Narrative outline

User's explicit ask: **one slide per region + an open-issues slide for
unresolved annotations**. Honour it literally.

World contents:

- 2 regions (`region_platform`, `region_data`)
- 6 nodes (3 in platform, 3 in data plane)
- 4 edges
- 2 annotations, both `resolved: false`

Proposed deck (5 slides):

```
00 Title         — "Order Fulfilment Platform" (world.metadata.title)
01 Today         — overview: 2 regions, 6 nodes, 4 edges, 2 open issues
02 Platform      — region_platform: auth / billing / orders + their edges
03 Data plane    — region_data: user DB / ledger bus / orders warehouse
04 Open issues   — both unresolved annotations, verbatim text + entities
```

No "Q&A" slide added — user did not request one and an empty placeholder
slide is filler.

## Phase 3 — Scaffold target

- Harness specifies `outputs/` as the write root and forbids the literal
  `.claude/live-render-presentation` path.
- Scaffolded the template at `outputs/deck/` instead.
- No `pnpm install` (no network in the sandbox); source files only.

## Phase 4 — Section authoring rules followed

- Every claim traces back to a `metadata.*` field on a world entity.
- Annotation `text` is quoted verbatim.
- No invented prose, no UI library imports, no fetches at render time.
- Deleted the bundled `_example.tsx` (replaced wholesale).

## Phase 5 — Verification

- `pnpm typecheck` / `pnpm dev` cannot run (no network → no
  `node_modules`). The source has been authored to satisfy the bundled
  `tsconfig.json` (strict, `noUnusedLocals`, `noUnusedParameters`).
- Manually traced every import and type to the bundled template; sections
  only consume the `Subsection` type from `Presenter.tsx`.
