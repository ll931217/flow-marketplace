# live-render-to-presentation — Iteration 1 Benchmark

Headless eval. 3 prompts × {with_skill, without_skill (no skill loaded)}.
Fixture: synthesized world.json with 2 regions, 6 nodes, 4 edges, 2 unresolved annotations.

## Summary

| Eval | with_skill | without_skill | Δ pass | Δ tokens | Δ duration |
|---|---|---|---|---|---|
| eval-casual-make-deck | 8/8 (82374 tok, 198s) | 1/8 (42197 tok, 123s) | +7 | +40177 | +75s |
| eval-explicit-vite-deck | 8/8 (82648 tok, 211s) | 2/8 (49518 tok, 138s) | +6 | +33130 | +73s |
| eval-narrative-first | 10/10 (70986 tok, 179s) | 3/10 (33407 tok, 44s) | +7 | +37579 | +135s |
| **Totals** | **26/26 (100%)** | **6/26 (23%)** | +20 | +110886 | +282s |

## Per-eval assertion breakdown

### eval-casual-make-deck

| # | Assertion | with_skill | without_skill |
|---|---|---|---|
| 1 | Output has package.json declaring vite as a dep | ✅ | ❌ |
| 2 | Output has src/Presenter.tsx (or App imports a Presenter) | ✅ | ❌ |
| 3 | Output has src/App.tsx with a default export | ✅ | ❌ |
| 4 | src/sections/ exists with at least one non-_example .tsx file (found 8) | ✅ | ❌ |
| 5 | App.tsx imports at least 2 distinct authored sections (found 8) | ✅ | ❌ |
| 6 | _example.tsx deleted or not imported by App.tsx | ✅ | ✅ |
| 7 | At least one section references a real entity from the world fixture | ✅ | ❌ |
| 8 | Unresolved annotation content (pricing OR retention) appears in section files | ✅ | ❌ |

**Outputs:** `live-render-to-presentation-workspace/iteration-1/eval-casual-make-deck/with_skill/outputs` (with_skill) vs `live-render-to-presentation-workspace/iteration-1/eval-casual-make-deck/without_skill/outputs` (baseline)

### eval-explicit-vite-deck

| # | Assertion | with_skill | without_skill |
|---|---|---|---|
| 1 | Output has package.json declaring vite as a dep | ✅ | ✅ |
| 2 | Output has src/Presenter.tsx (or App imports a Presenter) | ✅ | ❌ |
| 3 | Output has src/App.tsx with a default export | ✅ | ❌ |
| 4 | src/sections/ exists with at least one non-_example .tsx file (found 5) | ✅ | ❌ |
| 5 | App.tsx imports at least 2 distinct authored sections (found 5) | ✅ | ❌ |
| 6 | _example.tsx deleted or not imported by App.tsx | ✅ | ✅ |
| 7 | At least one section references a real entity from the world fixture | ✅ | ❌ |
| 8 | Unresolved annotation content (pricing OR retention) appears in section files | ✅ | ❌ |

**Outputs:** `live-render-to-presentation-workspace/iteration-1/eval-explicit-vite-deck/with_skill/outputs` (with_skill) vs `live-render-to-presentation-workspace/iteration-1/eval-explicit-vite-deck/without_skill/outputs` (baseline)

### eval-narrative-first

| # | Assertion | with_skill | without_skill |
|---|---|---|---|
| 1 | outputs/decisions.md exists | ✅ | ✅ |
| 2 | decisions.md has at least 4 bulleted/numbered outline entries | ✅ | ✅ |
| 3 | Output has package.json declaring vite as a dep | ✅ | ❌ |
| 4 | Output has src/Presenter.tsx (or App imports a Presenter) | ✅ | ❌ |
| 5 | Output has src/App.tsx with a default export | ✅ | ❌ |
| 6 | src/sections/ exists with at least one non-_example .tsx file (found 8) | ✅ | ❌ |
| 7 | App.tsx imports at least 2 distinct authored sections (found 8) | ✅ | ❌ |
| 8 | _example.tsx deleted or not imported by App.tsx | ✅ | ✅ |
| 9 | At least one section references a real entity from the world fixture | ✅ | ❌ |
| 10 | Unresolved annotation content (pricing OR retention) appears in section files | ✅ | ❌ |

**Outputs:** `live-render-to-presentation-workspace/iteration-1/eval-narrative-first/with_skill/outputs` (with_skill) vs `live-render-to-presentation-workspace/iteration-1/eval-narrative-first/without_skill/outputs` (baseline)

---

## How to inspect outputs qualitatively

Each eval has two `outputs/` directories side-by-side. Compare:

- **File shape** — does the with_skill output match the skill's intended layout?
- **Narrative quality** (presentation only) — do sections read well, or are they padded?
- **Mermaid syntax** (markdown only) — do diagrams parse cleanly?
- **Annotation handling** — is the human's annotation text quoted verbatim?