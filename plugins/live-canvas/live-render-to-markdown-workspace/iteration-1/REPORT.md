# live-render-to-markdown — Iteration 1 Benchmark

Headless eval. 3 prompts × {with_skill, without_skill (no skill loaded)}.
Fixture: synthesized world.json with 2 regions, 6 nodes, 4 edges, 2 unresolved annotations.

## Summary

| Eval | with_skill | without_skill | Δ pass | Δ tokens | Δ duration |
|---|---|---|---|---|---|
| eval-share-in-slack | 10/10 (44693 tok, 65s) | 8/10 (37689 tok, 58s) | +2 | +7004 | +8s |
| eval-mermaid-per-region | 10/10 (44297 tok, 58s) | 9/10 (34153 tok, 53s) | +1 | +10144 | +5s |
| eval-commit-to-repo | 10/10 (44020 tok, 55s) | 7/10 (40507 tok, 75s) | +3 | +3513 | -20s |
| **Totals** | **30/30 (100%)** | **24/30 (80%)** | +6 | +20661 | +-8s |

## Per-eval assertion breakdown

### eval-share-in-slack

| # | Assertion | with_skill | without_skill |
|---|---|---|---|
| 1 | Output contains index.md (or README.md) | ✅ | ✅ |
| 2 | Output contains at least 2 per-region markdown files (found 2) | ✅ | ✅ |
| 3 | index.md contains a ```mermaid fenced block | ✅ | ✅ |
| 4 | At least one region page contains a mermaid block (found 2) | ✅ | ✅ |
| 5 | index.md contains a relative ./*.md link | ✅ | ✅ |
| 6 | Annotation (pricing or retention) appears as a blockquote | ✅ | ✅ |
| 7 | Pricing annotation on a platform-named page (as blockquote) | ✅ | ❌ |
| 8 | Retention annotation on a data-named page (as blockquote) | ✅ | ❌ |
| 9 | Footer / provenance line on index (mentions 'generated', 'live-render', or workspace path) | ✅ | ✅ |
| 10 | No YAML frontmatter on any md file (found 0 with frontmatter) | ✅ | ✅ |

**Outputs:** `live-render-to-markdown-workspace/iteration-1/eval-share-in-slack/with_skill/outputs` (with_skill) vs `live-render-to-markdown-workspace/iteration-1/eval-share-in-slack/without_skill/outputs` (baseline)

### eval-mermaid-per-region

| # | Assertion | with_skill | without_skill |
|---|---|---|---|
| 1 | Output contains index.md (or README.md) | ✅ | ✅ |
| 2 | Output contains at least 2 per-region markdown files (found 2) | ✅ | ✅ |
| 3 | index.md contains a ```mermaid fenced block | ✅ | ✅ |
| 4 | At least one region page contains a mermaid block (found 2) | ✅ | ✅ |
| 5 | index.md contains a relative ./*.md link | ✅ | ✅ |
| 6 | Annotation (pricing or retention) appears as a blockquote | ✅ | ✅ |
| 7 | Pricing annotation on a platform-named page (as blockquote) | ✅ | ✅ |
| 8 | Retention annotation on a data-named page (as blockquote) | ✅ | ✅ |
| 9 | Footer / provenance line on index (mentions 'generated', 'live-render', or workspace path) | ✅ | ❌ |
| 10 | No YAML frontmatter on any md file (found 0 with frontmatter) | ✅ | ✅ |

**Outputs:** `live-render-to-markdown-workspace/iteration-1/eval-mermaid-per-region/with_skill/outputs` (with_skill) vs `live-render-to-markdown-workspace/iteration-1/eval-mermaid-per-region/without_skill/outputs` (baseline)

### eval-commit-to-repo

| # | Assertion | with_skill | without_skill |
|---|---|---|---|
| 1 | Output contains index.md (or README.md) | ✅ | ✅ |
| 2 | Output contains at least 2 per-region markdown files (found 2) | ✅ | ✅ |
| 3 | index.md contains a ```mermaid fenced block | ✅ | ❌ |
| 4 | At least one region page contains a mermaid block (found 2) | ✅ | ✅ |
| 5 | index.md contains a relative ./*.md link | ✅ | ✅ |
| 6 | Annotation (pricing or retention) appears as a blockquote | ✅ | ✅ |
| 7 | Pricing annotation on a platform-named page (as blockquote) | ✅ | ❌ |
| 8 | Retention annotation on a data-named page (as blockquote) | ✅ | ❌ |
| 9 | Footer / provenance line on index (mentions 'generated', 'live-render', or workspace path) | ✅ | ✅ |
| 10 | No YAML frontmatter on any md file (found 0 with frontmatter) | ✅ | ✅ |

**Outputs:** `live-render-to-markdown-workspace/iteration-1/eval-commit-to-repo/with_skill/outputs` (with_skill) vs `live-render-to-markdown-workspace/iteration-1/eval-commit-to-repo/without_skill/outputs` (baseline)

---

## How to inspect outputs qualitatively

Each eval has two `outputs/` directories side-by-side. Compare:

- **File shape** — does the with_skill output match the skill's intended layout?
- **Narrative quality** (presentation only) — do sections read well, or are they padded?
- **Mermaid syntax** (markdown only) — do diagrams parse cleanly?
- **Annotation handling** — is the human's annotation text quoted verbatim?