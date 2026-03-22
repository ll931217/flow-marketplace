---
name: ai-review
description: AI Multi-Agent Plan Review Engine that orchestrates specialized agents to iteratively generate, critique, refine, and validate structured plans. Use when the user wants to plan something, brainstorm ideas, create a PRD, validate a plan, get multi-agent review, or improve a strategy. Automatically triggers on keywords like "plan", "brainstorm", "review", "validate", "strategy", "PRD", "roadmap", or when the user asks for help creating or improving a plan.
---

# AI Multi-Agent Plan Review Engine

Orchestrate multiple specialized AI agents to iteratively generate, critique, and refine plans until quality thresholds are met.

## When This Skill Triggers

Use this skill when the user:
- Wants to **create a plan** for something
- Asks to **brainstorm** or **ideate** on a strategy
- Requests a **multi-agent review** or **parallel review**
- Wants to **validate** or **critique** an existing plan
- Mentions **PRD**, **roadmap**, or **implementation plan**
- Uses phrases like "help me plan", "review my plan", "critique this strategy"

## Quick Start

```
User: "Help me plan a user authentication system"
User: "Brainstorm a migration strategy from monolith to microservices"
User: "Review my plan for the new API gateway"
User: "Create a PRD for a real-time collaboration feature"
```

The skill automatically:
1. Spawns a **Planner agent** to generate/refine the plan
2. Runs **Critic agents** in parallel (Implementation, Security, Performance)
3. Spawns a **Judge agent** to score and resolve conflicts
4. Iterates until convergence or max iterations

## Architecture

```
User Goal
    ↓
┌─────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                         │
│  (State management, iteration loop, convergence)        │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────┐     ┌─────────────────────────────────────┐
│   PLANNER   │ --> │        CRITICS (parallel)           │
│   (Claude)  │     │  Implementation | Security |        │
│             │     │      Performance                    │
└─────────────┘     └─────────────────────────────────────┘
                           ↓
                    ┌─────────────┐
                    │    JUDGE    │
                    │   (Claude)  │
                    └─────────────┘
                           ↓
                    [Score & Converge?]
                           ↓
                    Final Plan (plan.md)
```

## Implementation

### Step 1: Initialize State

Create a unique run directory and initialize state:

```bash
RUN_ID=$(python3 scripts/orchestrator.py init --goal "<user goal>")
```

State is persisted in `$TMPDIR/.ai-review/<run_id>/state.json`

### Step 2: Run Orchestration Loop

The orchestrator manages the iteration loop:

```bash
python3 scripts/orchestrator.py run --run-id $RUN_ID
```

**Iteration Loop:**
1. **Planner** - Generate or refine plan
2. **Check blocking questions** - Pause if needed
3. **Critics** (parallel) - Analyze plan from multiple perspectives
4. **Aggregation** - Merge critiques, dedupe, flag conflicts
5. **Judge** - Score plan, resolve conflicts
6. **Convergence check** - Exit if threshold met or delta stall

### Step 3: Output Results

On completion:
- `plan.md` - Human-readable plan
- `report.json` - Machine-readable summary with scores, iterations, convergence reason

## Agent Prompts

Load agent-specific prompts from `agents/` directory:

| Agent | File | Provider | Role |
|-------|------|----------|------|
| Planner | `agents/planner.md` | Claude | Generate/refine plans, ask clarifying questions |
| Critic (Impl) | `agents/critic-implementation.md` | OpenAI | Correctness, feasibility, missing steps |
| Critic (Security) | `agents/critic-security.md` | OpenAI | Auth gaps, data exposure, unsafe assumptions |
| Critic (Performance) | `agents/critic-performance.md` | OpenAI | Bottlenecks, scalability, inefficiencies |
| Judge | `agents/judge.md` | Claude | Score plan, resolve conflicts, check convergence |

## Scoring Rubric

See `references/scoring-rubric.md` for the full weighted scoring criteria:

| Metric | Weight | Minimum |
|--------|--------|---------|
| Correctness | 30% | ≥ 0.85 |
| Completeness | 20% | - |
| Feasibility | 20% | ≥ 0.80 |
| Clarity | 10% | - |
| Efficiency | 10% | - |
| Risk | 10% | - |

**Acceptance:** `weightedScore ≥ 0.90` AND all minimums met AND no blocking issues AND no critical assumptions.

## Convergence Rules

See `references/convergence-rules.md` for details:

**Threshold Convergence:**
- weightedScore ≥ target_score (default 0.90)
- All minimum thresholds met
- No blocking issues
- No critical assumptions

**Delta Convergence (stall detection):**
- Score delta < 0.01 over last 2 iterations
- No new issues introduced
- Exits with best plan, doesn't fail

**Hard Stop:**
- Max iterations reached (default 5)

## State Management

State is persisted atomically to `$TMPDIR/.ai-review/<run_id>/state.json`:

```json
{
  "version": 1,
  "run_id": "run_abc123",
  "status": "running|paused|completed|failed",
  "current_step": "plan_generation|critique|evaluate|refine",
  "goal": "<user goal>",
  "plan": { ... },
  "iteration": 2,
  "history": [ ... ],
  "evaluation": { "scores": {...}, "weightedScore": 0.87 }
}
```

## Resume Flow

If execution pauses (blocking questions):

```bash
# User answers questions
python3 scripts/orchestrator.py resume --run-id $RUN_ID --answers answers.json
```

## Edge Case Guards

| Guard | Behavior |
|-------|----------|
| Planner ignoring feedback | Persistence tracking, severity escalation |
| Hallucinated critiques | Judge flags low-confidence issues, excludes from feedback |
| Conflict overload | Max 5 conflicts resolved per iteration |
| Stale high-confidence | Confidence decay after iteration 3 |

## Usage Examples

### Basic Usage

```python
# User provides goal naturally
# Skill auto-triggers and orchestrates

# In SKILL.md context, call:
import subprocess
result = subprocess.run([
    "python3",
    "~/.agents/skills/ai-review/scripts/orchestrator.py",
    "start",
    "--goal", "Design a user authentication system with OAuth2, MFA, and session management"
], capture_output=True)
```

### With Custom Config

```bash
python3 scripts/orchestrator.py start \
  --goal "Migrate from REST to GraphQL" \
  --max-iter 10 \
  --target-score 0.95 \
  --critics impl,security
```

### Resume After Pause

```bash
# Create answers.json
echo '{"answers": [{"question_id": "q1", "answer": "Use PostgreSQL"}]}' > answers.json

python3 scripts/orchestrator.py resume \
  --run-id run_abc123 \
  --answers answers.json
```

## File Structure

```
~/.agents/skills/ai-review/
├── SKILL.md                      # This file
├── agents/
│   ├── planner.md                # Planner agent prompt
│   ├── critic-implementation.md  # Implementation critic prompt
│   ├── critic-security.md        # Security critic prompt
│   ├── critic-performance.md     # Performance critic prompt
│   └── judge.md                  # Judge agent prompt
├── references/
│   ├── scoring-rubric.md         # Weighted scoring criteria
│   ├── state-schema.json         # JSON schema for state
│   └── convergence-rules.md      # Threshold & delta detection
├── scripts/
│   ├── orchestrator.py           # Main orchestration script
│   ├── agents/
│   │   ├── planner_agent.py      # Claude Agent SDK calls
│   │   ├── critic_agent.py       # OpenAI Agents SDK calls
│   │   └── judge_agent.py        # Claude Agent SDK calls
│   ├── state_manager.py          # State persistence
│   ├── aggregation.py            # Critique aggregation
│   └── convergence.py            # Convergence detection
└── templates/
    └── plan-output.md            # Final plan template
```

## Requirements

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) package manager
- `ANTHROPIC_API_KEY` environment variable
- `OPENAI_API_KEY` environment variable

## Installation

```bash
# Install dependencies with uv
cd ~/.agents/skills/ai-review
uv sync
```

## Final Instructions

1. **Always start with `orchestrator.py init`** to create a clean state
2. **Read agent prompts from `agents/`** before calling agent scripts
3. **Check convergence** after each iteration
4. **Persist state atomically** after each step
5. **Output plan.md** only on completion
6. **Maximum 5 iterations** by default (configurable)

Follow the iteration loop strictly. Do not skip steps. Convergence is guaranteed by threshold, delta, or hard stop.
