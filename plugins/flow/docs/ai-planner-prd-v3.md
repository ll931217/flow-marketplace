# 📄 Product Requirements Document (PRD)

## Product Name

AI Multi-Agent Plan Review Engine (`ai-review`)

## Version

3.0

## Author

Liang

## Date

2026-03-20

---

# 1. Overview

The AI Multi-Agent Plan Review Engine is a CLI-first orchestration system that uses multiple AI agents to iteratively generate, critique, refine, and validate structured plans.

It introduces:

- **multi-agent collaboration** with strict role separation
- **human-in-the-loop clarification** with blocking/non-blocking questions
- **deterministic pause/resume execution** via atomic state persistence
- **critic aggregation** before conflict resolution to eliminate noise
- **delta-based convergence** to prevent stale micro-iterations
- **pre-iteration budget estimation** to prevent half-baked runs
- **structured conflict resolution** with full traceability
- **edge case guards** for feedback avoidance, hallucinated critiques, and conflict overload

The system produces **high-confidence, implementation-ready plans** instead of single-shot AI outputs.

---

# 2. Objectives

## Primary Goals

- Generate high-quality, production-ready plans
- Reduce hallucination and incomplete reasoning
- Enforce structured critique, aggregation, conflict resolution, and refinement
- Enable deterministic and resumable execution

## Secondary Goals

- Provide full transparency via iteration history (append-only, with diffs)
- Enable automation via CLI and CI/CD pipelines
- Support extensibility (new critics, critic weights, scoring rules, swappable models)

---

# 3. Non-Goals

- Not a chatbot or conversational assistant
- Not autonomous code execution
- Not replacing human decision-making
- Not optimized for minimal latency

---

# 4. System Architecture

## Components

### 1. CLI Interface

Entry point for users and coding agents.

```bash
ai-review "<goal>"
ai-review resume <run_id> --answers answers.json
ai-review inspect <run_id>
```

Full CLI spec in Section 13.

---

### 2. Orchestrator

Central controller responsible for:

- iteration loop management
- critic output aggregation (deduplication + normalization)
- agent coordination and sequencing
- deterministic issue ranking before Planner feedback
- pre-iteration budget estimation
- pause/resume on blocking conditions
- atomic state persistence
- convergence detection (threshold-based and delta-based)

---

### 3. Agents

#### 🟣 Planner Agent

- Generates the initial plan
- Refines plan iteratively based on ranked feedback and user answers
- May ask up to 3 structured questions per iteration (2 on refinement)
- Cannot see scoring rules or evaluation output

#### 🟢 Critic Agents

Multiple specialized critics running in parallel:

- **Implementation** — correctness, feasibility, missing steps
- **Security** — auth gaps, data exposure, unsafe assumptions
- **Performance** — bottlenecks, scalability issues, inefficiencies

Each critic: identifies issues, suggests improvements, cannot score or finalize. Critic outputs are aggregated by the Orchestrator before reaching the Judge.

#### ⚖️ Judge Agent

- Receives deduplicated, aggregated critique (not raw parallel outputs)
- Evaluates plan quality against a hidden rubric
- Detects and resolves conflicts in aggregated issues
- Determines convergence
- Detects low-confidence critiques (hallucination guard)
- Cannot suggest improvements or rewrite the plan

#### 👤 Human-in-the-Loop

- Answers planner-generated questions
- Provides missing context
- Required to unblock execution when blocking questions are present

---

# 5. Core Data Structures

## 5.1 Plan

```json
{
  "steps": [
    { "id": "step_1", "description": "..." }
  ],
  "assumptions": {
    "resolved": [],
    "accepted": [],
    "critical": []
  }
}
```

See Section 5.6 for assumption classification rules.

---

## 5.2 Question

```json
{
  "id": "q1",
  "question": "...",
  "blocking": true,
  "reason": "..."
}
```

---

## 5.3 Critique (Raw — per critic)

```json
{
  "source": "security",
  "issues": [
    {
      "id": "issue_1",
      "type": "auth",
      "severity": "high",
      "description": "...",
      "target": "step_2",
      "persistence_count": 0
    }
  ],
  "suggestions": [
    { "target": "step_2", "change": "..." }
  ]
}
```

`persistence_count` is set by the Orchestrator — not the critic — and tracks how many consecutive iterations this issue has appeared unresolved. See Section 6.3 (Edge Case Guards).

---

## 5.4 Aggregated Critique

Produced by the Orchestrator after collecting all critic outputs. Passed to the Judge in place of raw critic outputs.

```json
{
  "issues": [
    {
      "id": "agg_issue_1",
      "source_issues": ["issue_1", "issue_3"],
      "sources": ["security", "implementation"],
      "merged": true,
      "severity": "high",
      "description": "...",
      "target": "step_2",
      "persistence_count": 2
    }
  ],
  "suggestions": [
    { "target": "step_2", "change": "..." }
  ],
  "conflict_candidates": ["agg_issue_1"]
}
```

Aggregation rules:

- Issues with the same `target` and overlapping `description` semantics are merged
- Severity is normalized to the **highest** reported severity across merged sources
- Duplicate suggestions for the same target are collapsed to one
- Conflict candidates are flagged where merged issues carry contradictory suggestions

---

## 5.5 Conflict Resolution

A conflict exists when two or more critics disagree on severity of an issue, make contradictory suggestions, or produce overlapping scope that creates ambiguity for the Planner.

**Cap: maximum 5 conflicts resolved per iteration.** If more than 5 conflict candidates exist after aggregation, the Judge prioritizes by severity (highest first). Excess conflicts are deferred to the next iteration.

```json
{
  "conflict_id": "c1",
  "type": "severity_disagreement | contradictory_suggestions | scope_overlap",
  "involved_critics": ["security", "performance"],
  "on_issue": "agg_issue_1",
  "decision": "...",
  "rationale": "...",
  "applied_changes": [
    { "target": "step_id", "resolution": "..." }
  ]
}
```

---

## 5.6 Assumption Classification

Assumptions are no longer a flat array. They are classified into three buckets:

| Bucket     | Meaning                                            | Blocks completion? |
| ---------- | -------------------------------------------------- | ------------------ |
| `critical` | Must be resolved before plan is finalized          | ✅ Yes             |
| `resolved` | Was critical, now answered via user input or plan  | ❌ No              |
| `accepted` | Valid, unavoidable, explicitly acknowledged        | ❌ No              |

Example of a valid `accepted` assumption: `"Assume API rate limit is 1000 req/s"` — this is a reasonable external constraint, not a gap.

Acceptance conditions (Section 8) check only that `critical` is empty. `accepted` assumptions are surfaced in `plan.md` for human awareness.

---

## 5.7 Evaluation

```json
{
  "scores": {
    "correctness": 0.0,
    "completeness": 0.0,
    "feasibility": 0.0,
    "clarity": 0.0,
    "efficiency": 0.0,
    "risk": 0.0
  },
  "weightedScore": 0.0,
  "blocking_issues": ["issue_id"],
  "confidence": 0.0,
  "low_confidence_critiques": ["agg_issue_id"]
}
```

`low_confidence_critiques` lists aggregated issue IDs the Judge flagged as potentially hallucinated (vague, unsubstantiated, or contradicted by the plan). These are excluded from Planner feedback but logged for transparency.

---

## 5.8 Plan Diff

Stored in each history entry. Computed by the Orchestrator by diffing the previous `plan_snapshot` against the current one.

```json
{
  "added_steps": ["step_5"],
  "removed_steps": [],
  "modified_steps": [
    { "id": "step_2", "before": "...", "after": "..." }
  ]
}
```

Used for debugging, UI replay, and convergence detection.

---

# 6. Orchestrator Flow

## 6.1 Iteration Loop

1. **Pre-iteration budget check** — estimate cost of this iteration; if remaining budget is insufficient, stop cleanly (see Section 15)
2. **Planner** → generate plan + questions
3. If blocking questions exist:
   - Set `status: paused`, `current_step: awaiting_user`
   - Write state atomically; exit
4. **Critics** → analyze plan in **parallel**
5. **Orchestrator aggregates** critic outputs: deduplicate, normalize severity, flag conflict candidates (see Section 5.4)
6. **Judge** → resolve conflicts from aggregated output (max 5 per iteration)
7. **Orchestrator ranks issues** deterministically (see Section 6.2) → select top issues as Planner feedback
8. **Planner** → refine plan
9. **Orchestrator computes plan diff** (current vs previous snapshot)
10. **Judge** → evaluate plan
11. Append full entry to history: `plan_snapshot`, `plan_diff`, `critiques`, `aggregated_critique`, `conflicts`, `evaluation`
12. **Check convergence** (see Section 6.4) and stopping conditions
13. Repeat or finalize

---

## 6.2 Deterministic Issue Ranking

Before passing feedback to the Planner, the Orchestrator ranks aggregated issues to ensure reproducible behavior:

```ts
issueScore =
  severityWeight(issue.severity)      // critical=4, high=3, medium=2, low=1
  + issue.persistence_count * 1.5     // penalize ignored issues
  + criticWeight(issue.sources)       // sum of weights for all source critics
```

Critic weights are configurable (see Section 13). Defaults:

```json
{
  "critic_weights": {
    "security": 1.5,
    "impl": 1.0,
    "performance": 1.0
  }
}
```

Top N issues (default: 5, configurable via `--max-feedback`) are passed to the Planner. The rest are logged but not surfaced.

---

## 6.3 Edge Case Guards

### Guard 1: Planner Ignoring Feedback

The Orchestrator tracks `persistence_count` on each issue across iterations. If a `high` or `critical` issue persists for **2 consecutive iterations** unmodified:

- Severity is escalated one tier (e.g., `high` → `critical`)
- A note is prepended to the Planner's next refinement prompt: `"The following issues have been raised multiple times and remain unaddressed."`

If the same issue persists for **3 iterations**: it becomes a blocking issue and halts convergence.

### Guard 2: Hallucinated Critiques

The Judge flags aggregated issues as `low_confidence` if they are vague, lack a concrete `target`, or are contradicted by the current plan. Low-confidence issues are excluded from Planner feedback and from `blocking_issues`. They are logged in `evaluation.low_confidence_critiques`.

### Guard 3: Conflict Overload

If more than 5 conflict candidates are detected after aggregation, only the top 5 by severity are resolved in the current iteration. Remaining candidates are carried forward as unresolved issues in the next iteration's aggregated critique. This prevents Judge overload and maintains a consistent per-iteration latency profile.

---

## 6.4 Convergence Detection

The system converges when **any** of the following conditions are met:

### Threshold Convergence (hard acceptance)
- `weightedScore ≥ target_score` (default 0.90, configurable via `--target-score`)
- `correctness ≥ 0.85`
- `feasibility ≥ 0.80`
- `blocking_issues` is empty
- `assumptions.critical` is empty

### Delta Convergence (stall detection)
- Score delta between last 2 iterations `< 0.01`, AND
- No new issues introduced in the last iteration

When delta convergence triggers before threshold convergence, the system exits with the best plan produced so far, notes the convergence reason in `report.json`, and sets status to `completed` (not `failed`). This prevents infinite micro-polishing loops.

### Hard Stop
- `iteration >= max_iter` (default 5) → exit code 4

---

# 7. Human-in-the-Loop

## Behavior

- Planner may ask up to **3 questions** on initial generation, **2 on refinement**
- Total question cap: **10 across all iterations**
- All questions must include `reason` justification
- Blocking questions (`blocking: true`) pause execution immediately

## Resume Flow

```bash
ai-review resume <run_id> --answers answers.json
```

## Answer Format

```json
{
  "answers": [
    { "question_id": "q1", "answer": "..." }
  ]
}
```

## Contradictory Answers

If a user answer contradicts a prior answer or a plan assumption, the Orchestrator flags it before injecting into the Planner context. The Planner receives both the answer and a contradiction note; it is responsible for resolving the conflict in the next plan iteration.

---

# 8. Scoring System

## Criteria

| Metric       | Weight |
| ------------ | ------ |
| Correctness  | 30%    |
| Completeness | 20%    |
| Feasibility  | 20%    |
| Clarity      | 10%    |
| Efficiency   | 10%    |
| Risk         | 10%    |

## Score Calculation

Scores are produced by the Judge as structured JSON. `weightedScore` is computed **deterministically by the Orchestrator** — not by the LLM:

```ts
const weightedScore =
  scores.correctness  * 0.30 +
  scores.completeness * 0.20 +
  scores.feasibility  * 0.20 +
  scores.clarity      * 0.10 +
  scores.efficiency   * 0.10 +
  scores.risk         * 0.10
```

## Acceptance Conditions

Plan is finalized only if **all** of the following hold:

- `weightedScore ≥ target_score` (default 0.90)
- `correctness ≥ 0.85`
- `feasibility ≥ 0.80`
- `blocking_issues` is empty
- `assumptions.critical` is empty

`assumptions.accepted` does **not** block finalization.

## Confidence Decay

If the system has run ≥ 3 iterations with delta convergence conditions approaching but threshold not met, the Judge applies a confidence decay multiplier:

```ts
confidence = raw_confidence * (1 - 0.05 * (iteration - 3))
```

This prevents inflated confidence scores on stalled runs and surfaces the decay in `report.json`.

## Information Hiding Rules

- Planner cannot see scoring rules or evaluation output
- Critics cannot output scores or reference the rubric
- Judge has full visibility of rubric and all aggregated critique

---

# 9. State Management

## File: `state.json`

Governed by `state.schema.json` and enforced via Zod at every read/write.

### Top-Level Fields

| Field               | Type                                                         | Description                              |
| ------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| `version`           | integer                                                      | Schema version for migration             |
| `run_id`            | string                                                       | Unique run identifier                    |
| `status`            | `running\|paused\|completed\|failed`                         | Lifecycle status                         |
| `current_step`      | `plan_generation\|awaiting_user\|critique\|refine\|evaluate` | Active step in the loop                  |
| `goal`              | string                                                       | User-provided goal                       |
| `constraints`       | string[]                                                     | Constraints injected into Planner prompt |
| `plan`              | Plan                                                         | Current plan snapshot                    |
| `iteration`         | integer                                                      | Current iteration number                 |
| `pending_questions` | Question[]                                                   | Questions awaiting human input           |
| `user_answers`      | Answer[]                                                     | Accumulated human answers                |
| `history`           | HistoryEntry[]                                               | Append-only iteration log                |
| `context`           | object                                                       | Metadata — see below                     |

### `context` Conventional Fields

```json
{
  "last_updated": "ISO8601",
  "prompt_version": "v1",
  "agent_versions": {
    "planner": "v1",
    "critic": "v1",
    "judge": "v1"
  },
  "token_usage": {
    "total": 0,
    "by_agent": { "planner": 0, "critic": 0, "judge": 0 }
  },
  "critic_weights": {
    "security": 1.5,
    "impl": 1.0,
    "performance": 1.0
  },
  "target_score": 0.90,
  "convergence_reason": null
}
```

### History Entry Schema

```json
{
  "iteration": 1,
  "plan_snapshot": {
    "goal": "...",
    "constraints": [],
    "steps": [],
    "assumptions": { "resolved": [], "accepted": [], "critical": [] }
  },
  "plan_diff": {
    "added_steps": [],
    "removed_steps": [],
    "modified_steps": []
  },
  "critiques": [],
  "aggregated_critique": {},
  "conflicts": [],
  "evaluation": {}
}
```

History is **append-only**. Shrinking history is a fatal validation error.

### Schema Versioning

`version` is stored in every `state.json`. On resume, if version mismatches:
- Auto-migrate if a migration function exists for that version bump
- Otherwise: exit code 2, `"State version mismatch: expected vN, got vM. Run migration tool."`

Never silently load a mismatched schema.

---

# 10. Step Transitions

Valid step transitions enforced at state write time:

```
plan_generation → awaiting_user | critique
awaiting_user   → refine
critique        → refine
refine          → evaluate
evaluate        → critique          (continue iterating)
```

`completed` and `failed` are **status values**, not steps. `status: completed` may only be set when `current_step === "evaluate"`. Any other transition is a fatal error.

---

# 11. Pause / Resume

## Pause Conditions

- Blocking questions detected after Planner output

## Pause Behavior

1. Set `status: paused`, `current_step: awaiting_user`
2. Acquire lock file
3. Write atomically (`state.json.tmp` → `rename`)
4. Release lock file
5. Exit cleanly

## Resume Behavior

1. Load and validate `state.json`
2. Verify `status: paused`
3. Inject user answers into `user_answers`
4. Set `status: running`
5. Continue from `refine` step

## Lock File

Lock file path: `<run_dir>/state.lock`

Lock file contents:

```json
{
  "pid": 1234,
  "timestamp": "ISO8601"
}
```

On lock acquisition:
- If no lock file exists → create and proceed
- If lock file exists and PID is **alive** → exit with error (concurrent run detected)
- If lock file exists and PID is **dead** → log warning `"Stale lock detected (pid 1234, dead). Overriding."` → delete and proceed

This eliminates the manual lock-clearing requirement while preserving safety against genuine concurrent writes.

---

# 12. Prompt System

## Temperature Tuning

| Agent   | Temperature | Rationale                     |
| ------- | ----------- | ----------------------------- |
| Planner | 0.6         | Creative but structured       |
| Critic  | 0.2         | Sharp, consistent, repeatable |
| Judge   | 0.1         | Strict, deterministic         |

## Output Enforcement

All agent calls must:
1. Use JSON mode / `response_format` if the model supports it
2. Validate response against Zod schema before use
3. Retry on invalid JSON (see Section 14)

## Prompt Versioning

`prompt_version` is stored in `context` at run creation. On resume, the same prompt version is always used — prompts are never upgraded mid-run.

## Agent Responsibilities Matrix

| Agent   | Generate Plan | Ask Questions   | Score | Resolve Conflicts | Aggregate |
| ------- | ------------- | --------------- | ----- | ----------------- | --------- |
| Planner | ✅            | ✅ (max 3/iter) | ❌    | ❌                | ❌        |
| Critic  | ❌            | ❌              | ❌    | ❌                | ❌        |
| Judge   | ❌            | ❌              | ✅    | ✅                | ❌        |
| Orchestrator | ❌       | ❌              | ❌    | ❌                | ✅        |

---

# 13. CLI Interface

## Commands

```bash
# Start a new run
ai-review "<goal>"

# Resume a paused run
ai-review resume <run_id> --answers answers.json

# Inspect state without resuming
ai-review inspect <run_id>
```

## Options

| Flag              | Default      | Description                                              |
| ----------------- | ------------ | -------------------------------------------------------- |
| `--max-iter`      | 5            | Maximum iterations before hard stop                     |
| `--verbose`       | false        | Stream agent outputs to stdout                          |
| `--critics`       | all          | Comma-separated: `impl,security,performance`            |
| `--output`        | pretty       | `json` or `pretty`                                      |
| `--dry-run`       | false        | Validate state + prompts without calling APIs           |
| `--budget`        | none         | Token or cost cap: `50000` or `$0.50`                   |
| `--target-score`  | 0.90         | Weighted score threshold for acceptance                 |
| `--max-feedback`  | 5            | Max issues passed to Planner per iteration              |
| `--critic-weight` | (see below)  | Override critic weight: `--critic-weight security=2.0`  |

## Exit Codes

| Code | Meaning                      |
| ---- | ---------------------------- |
| 0    | Completed successfully       |
| 1    | Paused (awaiting user input) |
| 2    | Fatal error                  |
| 3    | Budget exceeded              |
| 4    | Max iterations reached       |

---

# 14. Error Taxonomy

## Tier 1 — Recoverable

| Error                      | Behavior                                         |
| -------------------------- | ------------------------------------------------ |
| Agent returns invalid JSON | Retry up to 3 times, then escalate to fatal      |
| Agent call timeout (30s)   | Retry with backoff (1s, 2s, 4s), then escalate  |
| Non-blocking question missing answer | Skip, log warning, continue           |

## Tier 2 — Fatal

| Error                           | Behavior                                         |
| ------------------------------- | ------------------------------------------------ |
| State schema validation failure | Write `status: failed` + `failure_reason`, exit 2 |
| History shrink detected         | Write `status: failed`, exit 2                  |
| Invalid step transition         | Write `status: failed`, exit 2                  |
| Max retries exceeded            | Write `status: failed`, exit 2                  |
| Live lock file conflict         | Exit 2, do not write state                      |
| Schema version mismatch         | Exit 2, require migration                       |
| `status: completed` from non-evaluate step | Write `status: failed`, exit 2      |

All fatal errors write `failure_reason` to `context` before exiting.

---

# 15. Token / Cost Budget

## Budget Tracking

Token usage tracked per-agent in `context.token_usage`:

```json
{
  "token_usage": {
    "total": 12400,
    "by_agent": {
      "planner": 4200,
      "critic_impl": 2100,
      "critic_security": 2000,
      "critic_performance": 1900,
      "judge": 2200
    }
  }
}
```

## Pre-Iteration Budget Estimation

Before each iteration, the Orchestrator estimates token cost:

```ts
estimated = (
  planner_avg_tokens +
  (critic_avg_tokens * active_critic_count) +
  judge_avg_tokens
)

if (context.token_usage.total + estimated > budget) {
  // Write status: failed, failure_reason: "budget_insufficient_for_next_iteration"
  // Exit code 3
}
```

Averages are seeded from defaults and updated using a rolling mean across iterations of the current run. This prevents starting an iteration the system cannot finish.

## Budget Enforcement

Set via `--budget <tokens>` or `--budget $<usd>`. Hard cap enforced before each iteration. Per-call checks remain as a secondary guard.

---

# 16. Output Format

On `status: completed`, two artifacts are written to `./runs/<run_id>/`:

### `plan.md` — Human-Readable Deliverable

```markdown
# Plan: <goal>

## Steps
1. <description>
2. ...

## Accepted Assumptions
- "Assume API rate limit is 1000 req/s" ← not a gap, explicitly acknowledged

## Run Summary
- Iterations: N
- Final Score: 0.93
- Convergence: threshold | delta
- Critics: impl, security, performance
- Conflicts Resolved: 2
- Questions Asked: 3
```

### `report.json` — Machine-Readable Summary

```json
{
  "run_id": "...",
  "goal": "...",
  "status": "completed",
  "iterations": 3,
  "convergence_reason": "threshold | delta",
  "final_score": 0.93,
  "scores": { "correctness": 0.91, "completeness": 0.90, "..." : 0.0 },
  "conflicts_resolved": 2,
  "questions_asked": 3,
  "low_confidence_critiques_excluded": 1,
  "token_usage": { "total": 14200 },
  "plan": { "steps": [], "assumptions": { "resolved": [], "accepted": [], "critical": [] } }
}
```

Both files are written atomically. On `status: failed`, only `report.json` is written.

---

# 17. Validation Layer

All state validated via Zod at every read/write. Enforces:

- Schema integrity (required fields, types, enum values)
- Valid step transitions
- History append-only invariant
- Blocking questions → `status: paused` consistency
- `weightedScore` computed by Orchestrator (LLM value discarded)
- `assumptions.critical` empty on completion
- `status: completed` only from `evaluate` step

Validation failure is always fatal.

---

# 18. Non-Functional Requirements

## Performance

- Default ≤ 5 iterations
- Critic calls execute in parallel per iteration
- Agent timeout: 30s default
- Pre-iteration budget check before every iteration

## Reliability

- Deterministic resume from any paused state
- Atomic state writes (tmp + rename)
- PID-aware lock file with dead-process override
- All agent outputs validated before use
- Convergence guaranteed (threshold, delta, or hard stop)

## Extensibility

- New critics: implement `CritiqueSchema`, register in Orchestrator, add to `critic_weights`
- New scoring criteria: update rubric + `ScoresSchema` (schema version bump required)
- Swap models: Orchestrator is model-agnostic; configure per agent

---

# 19. Risks & Mitigations

| Risk                        | Mitigation                                              |
| --------------------------- | ------------------------------------------------------- |
| Infinite loops              | Iteration cap + delta convergence                       |
| Rubric gaming by Planner    | Hidden scoring; Planner never sees rubric               |
| JSON corruption             | Atomic writes + Zod validation on every I/O             |
| Over-engineering            | Efficiency scoring criterion                            |
| Question spam               | Per-iteration cap + 10-question total cap               |
| Token overrun               | Pre-iteration estimation + hard cap                     |
| Half-baked iterations       | Budget pre-check before iteration start                 |
| Prompt drift on resume      | Prompt version locked at run creation                   |
| Stale lock file             | PID liveness check + auto-override with warning         |
| Contradictory answers       | Flagged before Planner injection                        |
| Critic noise / duplicates   | Orchestrator aggregation layer before Judge             |
| Non-deterministic feedback  | Deterministic issue ranking formula                     |
| Planner ignoring feedback   | Persistence tracking + severity escalation              |
| Hallucinated critiques      | Judge low-confidence detection; excluded from feedback  |
| Conflict overload           | Max 5 conflicts resolved per iteration; rest deferred   |
| Stale high-confidence score | Confidence decay after iteration 3 with low delta       |
| Unavoidable assumptions     | `accepted` bucket; doesn't block completion             |

---

# 20. Success Metrics

- % of plans reaching `target_score`
- Reduction in blocking issues across iterations
- Iteration convergence speed (target: ≤ 3 for well-specified goals)
- Token efficiency (score per 1k tokens)
- Rate of delta convergence vs threshold convergence (high delta rate = goals are under-specified)
- Frequency of persistence escalation (high rate = Planner prompt needs tuning)

---

# 21. Future Enhancements

- Web UI dashboard with iteration replay using `plan_diff` data
- GitHub PR integration (plan → PR description)
- Plan → code generation pipeline
- Persistent learning across runs (recurring issue patterns from history)
- Domain-specific critics (database, infrastructure, compliance)
- Split Judge into Resolver Agent + Evaluator Agent for latency scaling
- Semantic diff of plan changes between iterations

---

# 22. Summary

`ai-review` transforms AI from a single-response generator into a structured, multi-agent review engine with:

- iterative refinement under strict role separation
- critic aggregation to eliminate noise before the Judge sees it
- deterministic issue ranking to ensure reproducible Planner feedback
- delta-based and threshold-based convergence to prevent stale loops
- human collaboration with blocking/non-blocking question handling
- pre-iteration budget estimation to prevent half-baked runs
- edge case guards for feedback avoidance, hallucinated critiques, and conflict overload
- PID-aware lock files for safe concurrent operation
- two delivery artifacts: a human-readable plan and a machine-readable report

The result is a reliable, production-grade system for generating high-confidence, implementation-ready plans.
