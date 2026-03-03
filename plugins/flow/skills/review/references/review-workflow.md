# Review Workflow

## Overview

Step-by-step workflow for multi-dimensional code review after implementation. Uses parallel team-reviewers when agent-teams is available, falls back to sequential single-agent review otherwise.

## Step 1: Determine Changed Files

Identify all files modified during implementation:

```bash
# Get changed files since implementation started
git diff --name-only <pre-implementation-checkpoint>..HEAD
```

If no checkpoint is available, use the PRD branch point:

```bash
git diff --name-only $(git merge-base main HEAD)..HEAD
```

## Step 2: Categorize Files

Map changed files to review dimensions:

| File Pattern | Relevant Dimensions |
|-------------|-------------------|
| `src/api/`, `src/routes/`, `src/middleware/` | Security, Performance, Architecture |
| `src/components/`, `src/pages/`, `*.tsx` | Accessibility, Performance, Architecture |
| `src/services/`, `src/utils/`, `src/lib/` | Architecture, Performance, Security |
| `src/models/`, `src/db/`, `*.sql` | Security, Performance |
| `tests/`, `*.test.*`, `*.spec.*` | Testing |
| `src/types/`, `src/interfaces/` | Architecture |
| Configuration files | Security |

## Step 3: Select Dimensions

Choose 2-4 review dimensions based on file categorization:

| Condition | Dimensions Selected |
|-----------|-------------------|
| API/backend files changed | Security + Performance |
| UI/frontend files changed | Accessibility + Performance |
| Cross-layer changes | Architecture + Security + Performance |
| Test files changed | Testing |
| All of the above | Security + Performance + Architecture + Testing |

Maximum 4 dimensions per review to balance thoroughness with cost.

## Step 4: Execute Review

### Team Mode (agent-teams available)

1. **Create review team:**
   ```
   TeamCreate(team_name="flow-review-{session_id}")
   ```

2. **Spawn team-reviewers** — One per selected dimension:
   ```
   Agent(
     subagent_type="agent-teams:team-reviewer",
     name="reviewer-{dimension}",
     team_name="flow-review-{session_id}",
     prompt="Review the following files for {dimension} issues: {file_list}. Focus exclusively on {dimension} concerns."
   )
   ```

3. **Collect findings** — Wait for all reviewers to complete

4. **Cleanup team:**
   ```
   TeamDelete()
   ```

### Standard Mode (agent-teams unavailable)

Run a single-agent sequential review:

1. For each selected dimension, use the Agent tool with `subagent_type="code-reviewer"`:
   ```
   Agent(
     subagent_type="code-reviewer",
     prompt="Review {file_list} focusing on {dimension}. Use structured finding format."
   )
   ```

2. Collect findings from each sequential review

## Step 5: Consolidate Findings

### Deduplicate

When multiple reviewers flag the same issue:
- Keep the finding with the most specific file:line citation
- Merge supporting evidence from all reviewers
- Use the highest severity among duplicates

### Calibrate Severity

Apply consistent severity ratings:

| Severity | Criteria |
|----------|----------|
| **Critical** | Security vulnerability, data loss risk, crash in production |
| **High** | Performance regression, accessibility barrier, broken functionality |
| **Medium** | Code quality issue, minor performance concern, maintainability risk |
| **Low** | Style inconsistency, documentation gap, minor improvement opportunity |

### Generate Report

Produce a consolidated review report:

```markdown
# Code Review Report

## Summary
- Files reviewed: {count}
- Dimensions: {list}
- Findings: {critical} Critical, {high} High, {medium} Medium, {low} Low

## Critical Findings
{findings with severity=Critical}

## High Findings
{findings with severity=High}

## Medium Findings
{findings with severity=Medium}

## Low Findings
{findings with severity=Low}
```

## Step 6: Auto-Fix

Attempt automatic remediation for Critical and High severity findings:

### Auto-Fixable Patterns

| Finding Type | Auto-Fix Strategy |
|-------------|-------------------|
| Missing input validation | Add Zod/validation schema |
| Hardcoded secrets | Move to environment variables |
| Missing error handling | Add try/catch with proper error propagation |
| N+1 query patterns | Add eager loading / batch queries |
| Missing ARIA attributes | Add appropriate ARIA roles and labels |
| Missing test coverage | Generate test stubs for uncovered paths |

### Auto-Fix Protocol

1. For each Critical/High finding with a known fix pattern:
   - Apply the fix
   - Run tests to verify no regressions
   - If tests fail: revert the fix, keep the finding as unresolved
2. Update the review report with fix status (Fixed / Unfixed)

## Step 7: Report to User

Present the consolidated review report:

```
[Maestro] Phase 3.5: Review
[Maestro]   -> Reviewing {file_count} files across {dimension_count} dimensions
[Maestro]   -> {reviewer_count} reviewers completed
[Maestro]   -> Findings: {critical}C / {high}H / {medium}M / {low}L
[Maestro]   -> Auto-fixed: {fixed_count} of {fixable_count} fixable issues
[Maestro] OK Review complete
```
