---
name: dispatch
description: Smart skill router that auto-invokes the right skill for any action-oriented task. Analyzes the user's prompt AND current project state (PRDs, beads tasks, flow phase) to silently route to the best-matching skill — prioritizing flow skills (flow:plan, flow:generate-tasks, flow:implement, flow:review, flow:cleanup, flow:autonomous) but also detecting non-flow skills (decision-engine, systematic-debugging, taste, tdd-workflow, security-review, gh:create-commit). INVOKE THIS SKILL at the start of any task where the user wants to build, create, plan, implement, start, continue, fix, review, or deploy something. Fire before writing any code, making any plan, or taking any implementation action. Especially useful when the user's intent matches a flow workflow step but they didn't explicitly name the skill.
---

# Flow Dispatch

Silent skill router. Reads prompt intent + project state → invokes the right skill with zero friction.

## Step 1: Detect Project State

Run these silently before routing:

```bash
# Flow state (what phase are we in?)
FLOW_STATE=$(bash "${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh" get 2>/dev/null)
CURRENT_PHASE=$(echo "$FLOW_STATE" | grep 'current_phase' | cut -d= -f2 | tr -d ' ')

# PRDs present?
ALL_PRDS=$(ls .flow/prd-*.md 2>/dev/null)
APPROVED_PRD=$(grep -rl 'status: approved' .flow/ 2>/dev/null | head -1)

# Beads tasks?
OPEN_TASKS=$(bd list --status=open 2>/dev/null | grep -c 'beads-' || echo 0)
IN_PROGRESS=$(bd list --status=in_progress 2>/dev/null | grep -c 'beads-' || echo 0)
```

## Step 2: Route

Work through this decision tree top-to-bottom. First match wins.

### Always-first checks

| Signal | Route to |
|--------|---------|
| User already typed `/flow:X` or explicitly named a skill | **Skip dispatch** — just proceed |
| Pure Q&A ("what is X?", "explain Y", "how does Z work?") | **Skip dispatch** — answer directly |
| Trivial single-file edit (no workflow context, no architecture) | **Skip dispatch** — do it directly |

### Flow skill routing

| Condition | Route to |
|-----------|---------|
| Prompt contains "autonomous", "end-to-end", "do it all", "hands-off", "fully implement" | `flow:autonomous` |
| `current_phase == "implementing"` or `IN_PROGRESS > 0` | `flow:implement` |
| `current_phase == "approved"` or (`APPROVED_PRD` exists and `OPEN_TASKS == 0`) | `flow:generate-tasks` |
| `OPEN_TASKS > 0` and prompt signals implementation intent ("implement", "start", "continue", "work on", "go", "build") | `flow:implement` |
| Prompt contains "review", "audit", "check code", "quality", "code review" | `flow:review` |
| Prompt contains "cleanup", "wrap up", "done", "finished", "close out", "all tasks done" | `flow:cleanup` |
| `ALL_PRDS` not empty and user wants to revise or reprioritize | `flow:plan` |
| User wants to build/create/implement a feature and NO approved PRD exists | `flow:plan` |
| Prompt contains "tasks", "generate tasks", "break down" and `APPROVED_PRD` exists | `flow:generate-tasks` |

### Non-flow skill routing (when no flow skill fits)

These fire when the task doesn't belong to a flow workflow step:

| Signal | Route to |
|--------|---------|
| "which library", "what framework", "recommend tech", "architecture choice", "should I use X or Y" | `decision-engine` |
| "bug", "error", "broken", "failing", "exception", "crash", "not working", "debug" | `systematic-debugging` |
| "design", "UI", "UX", "make it look good", "styling", "visual", "frontend design" | `taste` |
| "write tests", "test coverage", "TDD", "unit tests", "add tests first" | `tdd-workflow` |
| "security", "vulnerability", "CSRF", "XSS", "SQL injection", "auth flaw" | `security-review` |
| "commit", "git commit", "save my changes", "create a commit" | `gh:create-commit` |

If the task signals one of the above but ALSO fits a flow skill, prefer the flow skill.

### Fallback

If no rule matches with confidence: skip dispatch and proceed directly.

## Step 3: Invoke

Call `Skill` tool with the winning skill name. Do **not** announce what you're doing or explain the routing decision — just invoke the skill and let it take over from there.

## Why This Works

The flow skills have specific state dependencies that Claude's general skill-matching can't see (PRD status, beads task count, flow phase). This skill makes those dependencies explicit, so the right skill gets invoked at the right time — not just based on keywords but based on *where you actually are* in the workflow.
