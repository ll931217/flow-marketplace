---
name: decision-engine
description: Autonomous decision-making engine for technical choices in technology selection, architecture patterns, and task ordering. Use when Maestro orchestrator needs to make decisions without human input for choosing libraries/frameworks based on existing codebase, selecting architectural patterns based on complexity and requirements, and optimizing task execution order based on dependency analysis. Analyzes codebase context, applies scoring rubrics, and returns structured decisions with rationale.
---

# Decision Engine

Autonomous decision-making for technical choices during implementation.

## Quick Start

```bash
# Technology stack selection
Decision: tech_stack("user authentication")
→ Analyzes codebase → Recommends Passport.js + PostgreSQL

# Architecture pattern selection
Decision: architecture_pattern("API rate limiting")
→ Analyzes complexity → Recommends middleware pattern

# Task ordering
Decision: task_ordering([taskA, taskB, taskC])
→ Analyzes dependencies → Recommends execution order
```

## Decision Types

### 1. Technology Stack Selection

Analyzes existing dependencies and codebase patterns to recommend technologies.

**Process:**
1. Scan existing dependency files (package.json, requirements.txt, go.mod, etc.)
2. Search codebase for existing implementations
3. Score options using rubric (see [references/tech-stack-rubric.md](references/tech-stack-rubric.md))
4. Return decision with rationale

**Usage:**
```
Input: "Need OAuth library for authentication"
Output: {
  "decision": "Passport.js",
  "rationale": "Already in package.json, mature ecosystem, 20K+ stars",
  "confidence": "high",
  "alternatives": ["auth0", "custom implementation"]
}
```

### 2. Architecture Pattern Selection

Selects appropriate architectural patterns based on complexity and requirements.

**Process:**
1. Analyze feature complexity (simple/medium/complex)
2. Check existing patterns in codebase
3. Match to pattern using rubric (see [references/architecture-patterns.md](references/architecture-patterns.md))
4. Return recommendation with rationale

**Usage:**
```
Input: "Implement file upload feature"
Output: {
  "pattern": "Service layer pattern",
  "rationale": "Medium complexity, existing service layer, separation of concerns",
  "confidence": "high"
}
```

### 3. Task Ordering with Dependency Resolution

Optimizes task execution order based on dependency analysis.

**Process:**
1. Parse beads dependency graph
2. Identify foundational tasks (no dependencies)
3. Detect parallel execution opportunities
4. Apply ordering strategies (see [references/task-ordering-strategies.md](references/task-ordering-strategies.md))
5. Return optimized sequence

**Usage:**
```
Input: ["implement schema", "create API", "write tests", "build UI"]
Output: {
  "sequence": [
    "implement schema",  # foundational
    ["create API", "build UI"],  # parallel group
    "write tests"  # depends on API
  ],
  "rationale": "Schema is foundational, API and UI can run in parallel"
}
```

## Gathering Context

No helper scripts - gather decision inputs directly with standard tools:

**Existing dependencies** (tech-stack decisions):
- Read the dependency manifests present at the project root: `package.json`,
  `requirements.txt`/`pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`, etc.
- Note lockfiles to distinguish direct vs transitive dependencies.

**Existing patterns** (architecture decisions):
- Grep for the pattern's signature (e.g. `middleware`, `Repository`, `Service`)
  and skim 2-3 hits to confirm the convention actually in use.
- Prefer following what the codebase already does over introducing a new pattern.

**Task dependencies** (ordering decisions):
- With beads: `bd dep tree <issue-id>` / `bd list --json` and build the order
  from `blocked_by` relations.
- Without beads: use the dependency notes in each task description.

## Reference Documentation

- **[tech-stack-rubric.md](references/tech-stack-rubric.md)** - Scoring criteria for technology decisions
- **[architecture-patterns.md](references/architecture-patterns.md)** - Pattern descriptions and usage guidelines
- **[task-ordering-strategies.md](references/task-ordering-strategies.md)** - Dependency resolution algorithms

## Output Schema

All decisions follow this structure:

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

## Integration with Maestro

The decision engine is invoked by Maestro during:

1. **Planning phase** - Before generating tasks, analyze codebase for architectural context
2. **Task execution** - Before each task, make technical decisions
3. **Dependency resolution** - When generating task order

Maestro invokes this skill at those points and uses the structured JSON
decision (see Output Schema) to drive task generation and execution order.

## Principles

1. **Prefer existing** - Favor technologies already in the codebase
2. **Match patterns** - Follow established architectural patterns
3. **Enable parallelism** - Maximize independent task execution
4. **Document rationale** - All decisions include reasoning
5. **Provide alternatives** - Always list fallback options
