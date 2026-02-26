# Decision Engine Usage

How Maestro invokes the decision engine during autonomous execution for technology selection, architecture patterns, and task ordering.

## When to Use the Decision Engine

The decision engine is invoked at these points during autonomous execution:

| Phase | Decision Type | Purpose |
|-------|--------------|---------|
| Planning | Tech stack | Select libraries, frameworks, tools |
| Planning | Architecture | Choose implementation patterns |
| Task Generation | Task ordering | Optimize execution sequence |
| Implementation | Tech stack | Resolve per-task technology choices |

## Technology Stack Selection

Analyze existing dependencies and codebase patterns to recommend technologies.

**Invocation:**
```python
from decision_engine.scripts.tech_stack_selector import TechStackSelector

selector = TechStackSelector(project_root)
decision = selector.select_technology("OAuth library", requirements={
    "language": "javascript",
    "framework": "Express",
    "existing_deps": ["passport"]
})
```

**Output:**
```json
{
  "decision": "Passport.js",
  "rationale": "Already in package.json, mature ecosystem, perfect fit",
  "confidence": "high",
  "alternatives": ["Auth.js", "Auth0"]
}
```

**Process:**
1. Scan existing dependency files (package.json, requirements.txt, go.mod, etc.)
2. Search codebase for existing implementations
3. Score options using the tech stack rubric
4. Return decision with rationale

## Architecture Pattern Selection

Select appropriate architectural patterns based on complexity and requirements.

**Invocation:**
```python
from decision_engine.scripts.architecture_pattern_matcher import ArchitecturePatternMatcher

matcher = ArchitecturePatternMatcher(project_root)
decision = matcher.select_pattern("User authentication", complexity="medium")
```

**Output:**
```json
{
  "pattern": "Middleware pattern",
  "rationale": "Medium complexity, existing middleware in codebase",
  "confidence": "high"
}
```

**Process:**
1. Analyze feature complexity (simple/medium/complex)
2. Check existing patterns in codebase
3. Match to pattern using architecture rubric
4. Return recommendation with rationale

## Task Ordering

Optimize task execution order based on dependency analysis.

**Invocation:**
```python
from decision_engine.scripts.task_ordering import TaskOrdering

ordering = TaskOrdering()
sequence = ordering.order_tasks(tasks, strategy="parallel-maximizing")
```

**Output:**
```json
{
  "sequence": [
    ["task-1", "task-2"],
    ["task-3", "task-4"],
    "task-5"
  ],
  "rationale": "Foundational tasks first, maximize parallelism"
}
```

**Process:**
1. Parse beads dependency graph
2. Identify foundational tasks (no dependencies)
3. Detect parallel execution opportunities
4. Apply ordering strategies
5. Return optimized sequence with `[P:Group-X]` markers

## Interpreting Decision Output

All decisions follow a common schema:

```json
{
  "decision_type": "tech_stack|architecture|task_ordering",
  "input": "<user request>",
  "output": {
    "decision": "<recommended choice>",
    "rationale": "<explanation>",
    "confidence": "high|medium|low",
    "alternatives": ["<option1>", "<option2>"],
    "context": {
      "existing_patterns": ["<found in codebase>"],
      "complexity": "simple|medium|complex",
      "dependencies": ["<related choices>"]
    }
  }
}
```

### Confidence Levels

| Level | Meaning | Action |
|-------|---------|--------|
| `high` | Strong match with existing codebase | Proceed without hesitation |
| `medium` | Reasonable choice, some uncertainty | Proceed, log the trade-offs |
| `low` | No clear winner, multiple valid options | Use fallback behavior |

## Fallback Behavior (Low Confidence)

When confidence is `low`:

1. **Check alternatives**: review the alternatives list for a better fit
2. **Prefer existing**: if one alternative is already in the codebase, use it regardless of score
3. **Default to simplest**: choose the option with lowest complexity
4. **Log the decision**: record that a low-confidence decision was made with full rationale
5. **Continue execution**: do NOT pause for human input unless `request_human_on_ambiguous` is enabled in config

If `decision_engine.confidence_threshold` in config is set (default: 0.6), any decision below the threshold triggers the fallback path.

## Decision Logging

All decisions are persisted to the session directory:

```
.flow/maestro/sessions/<session-id>/decisions.json
```

Each entry includes:
- Decision type
- Input context
- Selected output
- Confidence level
- Alternatives considered
- Timestamp

Historical decisions are also tracked in:
```
.flow/maestro/decisions/
  tech-stack.json
  architecture.json
  task-ordering.json
```

## Principles

1. **Prefer existing**: favor technologies already in the codebase
2. **Match patterns**: follow established architectural patterns
3. **Enable parallelism**: maximize independent task execution
4. **Document rationale**: all decisions include reasoning
5. **Provide alternatives**: always list fallback options
