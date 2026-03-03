# Subagent Delegation

## Overview

Each task is routed to a specialized subagent based on task metadata. This ensures domain-specific expertise is applied (e.g., frontend tasks go to a frontend developer, tests go to a test automator).

## Reading Subagent Type from Task Metadata

For each task, check metadata for `subagent_type`:

**With beads:**
- Query the beads issue for `subagent_type` metadata
- Extract `fallback_agents` array if present
- Extract `applicable_skills` array if present

**Without beads:**
- Check task description for skill trigger patterns
- Match against patterns in `.claude/subagent-types.yaml`

## Selection Process

1. **Read task metadata** - Query beads issue for `subagent_type`, `fallback_agents`, `applicable_skills`
2. **Select agent:**
   - Use `subagent_type` as primary agent
   - If primary agent is unavailable, try `fallback_agents` in order
   - If no metadata found, use auto-detection fallback
3. **Apply skills (if applicable):**
   - When `applicable_skills` array is present and non-empty
   - For each skill, use the Skill tool before launching the subagent
   - Pass skill output to guide the subagent's approach

## Auto-Detection Fallback

If task lacks `subagent_type` metadata:

1. Extract task description from beads issue
2. Match against patterns in `.claude/subagent-types.yaml`
3. Assign best-matching subagent type based on priority order
4. Check for associated skill in task category
5. Store assignment in task metadata for future reference
6. Proceed with specialized subagent execution

## Skill Pre-Invocation Patterns

Per `.claude/subagent-types.yaml`, the following task categories have associated skills:

| Category | Skill | When Applied |
|----------|-------|--------------|
| frontend | frontend-design | UI components, interfaces, styling |
| testing | webapp-testing | Test generation, browser testing |
| documentation | document-skills | API docs, user guides, reports |

### Invocation Order

For tasks with applicable skills, always invoke the skill **before** launching the subagent:

```
Step 1: Skill(skill="{skill_name}", args="{task_context}")
Step 2: Pass skill output as context to subagent
Step 3: Launch subagent with skill guidance + task description
```

### Conditional Skill Detection

When task metadata does not include `applicable_skills`, detect from description:
- Task contains "create UI component" -> Triggers `frontend-design` skill
- Task contains "test web app" -> Triggers `webapp-testing` skill
- Task contains "generate API docs" -> Triggers `document-skills` skill

## Task Tool Invocation Format

**Standard task (no skill):**
```javascript
Task(
  subagent="backend-architect",
  prompt="Implement login POST endpoint with JWT...",
  relevant_files=["src/api/routes.ts", "src/services/AuthService.ts"]
)
```

**Task with skill pre-invocation:**
```javascript
// Step 1: Apply skill
Skill(skill="frontend-design", args="Create distinctive UI for authentication flow")

// Step 2: Subagent receives skill guidance
Task(
  subagent="frontend-developer",
  prompt="Implement auth component following design guidelines...",
  relevant_files=["src/components/Login.tsx"]
)
```

**Parallel group with mixed skill/no-skill tasks:**
```javascript
// Task 1: Frontend component (with skill)
Skill(skill="frontend-design", args="Create UI for authentication flow")
Task(
  subagent="frontend-developer",
  prompt="Implement React login component with TypeScript...",
  relevant_files=["src/components/Login.tsx", "src/types/auth.ts"]
)

// Task 2: Backend API (no skill, parallel)
Task(
  subagent="backend-architect",
  prompt="Implement login POST endpoint with JWT...",
  relevant_files=["src/api/routes.ts", "src/services/AuthService.ts"]
)

// Task 3: Testing (with skill, parallel)
Skill(skill="webapp-testing", args="Generate Playwright tests for login flow")
Task(
  subagent="test-automator",
  prompt="Implement tests for authentication...",
  relevant_files=["tests/auth.test.ts"]
)
```

## Team-Implementer Delegation

When a parallel group uses team mode (see [team-execution.md](team-execution.md)), subagent delegation is enhanced with file ownership boundaries and structured coordination.

### Agent Type Override

In team mode, the `subagent_type` is overridden to `agent-teams:team-implementer` regardless of the task's original subagent assignment. The original subagent expertise is captured in the delegation prompt as context.

### Delegation Prompt Template

Each team-implementer receives a structured prompt:

```
## Task: {task_title}

{task_description}

### Original Expertise: {original_subagent_type}
Apply the patterns and conventions of a {original_subagent_type} agent.

### Agent Assignment
- **Primary Subagent:** agent-teams:team-implementer
- **Original Role:** {original_subagent_type}
- **Fallback Agents:** {fallback_agents}
- **Applicable Skills:** {applicable_skills}

### Owned Files (Exclusive Write)
{owned_files_table from task metadata}

### Read-Only Dependencies
{readonly_deps_table from task metadata}

### Interface Contracts
{interface_contracts from task metadata}

### Scope Boundaries
{scope_boundaries from task metadata}

### Acceptance Criteria
{acceptance_criteria from task/PRD}

### TDD Requirements
- Write tests FIRST for all new functionality
- Verify tests fail before implementing (RED)
- Implement until tests pass (GREEN)
- Run test suite to confirm no regressions
```

### Skill Pre-Invocation in Team Mode

Skills are still pre-invoked before team-implementer launch, following the same patterns as standard mode. The skill output is prepended to the delegation prompt.

### Standard vs Team Delegation

| Aspect | Standard Mode | Team Mode |
|--------|--------------|-----------|
| Agent type | From task metadata (e.g., `frontend-developer`) | `agent-teams:team-implementer` |
| File boundaries | Soft guidance in description | Enforced via owned files + scope boundaries |
| Coordination | None (fire-and-forget) | SendMessage to team-lead and peers |
| Monitoring | Wait for completion | Idle/progress signals |
| Error reporting | Return result to orchestrator | Message team-lead with details |

## Worktree Isolation

When delegating to subagents in parallel:
- Each subagent works on their assigned files (listed in task description)
- File assignments prevent conflicts between parallel subagents
- If worktree isolation is available via `wt`, use separate worktrees for large parallel groups
- Monitor for unintended file overlaps that could cause merge conflicts
