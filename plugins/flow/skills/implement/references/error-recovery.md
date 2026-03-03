# Error Recovery

## Overview

Handle build errors, test failures, dependency issues, and blocked tasks during implementation. The goal is to resolve issues autonomously when possible and escalate to the user only when necessary.

## Error Classification

| Error Type | Severity | Examples | Recovery Strategy |
|------------|----------|----------|-------------------|
| **Test failure** | High | Assertion errors, missing mocks | Fix implementation until tests pass |
| **Build error** | High | Compilation errors, syntax errors | Fix source code, rebuild |
| **Dependency issue** | Medium | Missing packages, version conflicts | Install missing deps, resolve conflicts |
| **Blocked task** | Medium | Upstream task incomplete, missing info | Wait or resolve blocker first |
| **Environment issue** | Low | Wrong Node version, missing tools | Adjust environment, document requirement |

## Retry Strategies

### Test Failures

1. Read the failing test output carefully
2. Identify the root cause (wrong assertion, missing implementation, incorrect mock)
3. Fix the implementation (not the test, unless the test is wrong)
4. Re-run the test suite
5. If still failing after 3 attempts, use iterative development loop

**Iterative development loop (Ralph Wiggum technique):**
- Check if Ralph plugin is installed before using Ralph commands
- If not installed, fall back to manual iteration: run tests -> fix failures -> repeat
- Set max iterations to prevent unbounded loops
- Include clear success criteria (all tests pass)

### Build Errors

1. Read the build error output
2. Fix the identified issue (syntax, types, imports)
3. Rebuild
4. If persistent, check for cascading errors - fix the first error and rebuild

### Dependency Issues

1. Check if the dependency is listed in the project's package manager file
2. If missing: install using the project's package manager
3. If version conflict: check compatibility, update to compatible version
4. If peer dependency: install the required peer

## Blocked Task Handling

When a task cannot proceed:

### Step 1: Update Status

- Update task status to `blocked` in beads
- Add notes explaining the specific reason for the block

### Step 2: Notify User

Explain what is blocked and why:
- List specific failing tests or missing dependencies
- Suggest next steps to resolve
- Do NOT suggest the user run `bd` commands (reserved for AI agents)

### Step 3: Do NOT Proceed

Do not proceed to dependent tasks until the blocker is resolved.

### Step 4: Resume

Once the blocker is resolved:
1. Fix the underlying issue
2. Run tests again to verify
3. Update task status from `blocked` to `in_progress`
4. Continue execution from where it left off

## Alternative Approaches

When the initial implementation approach fails repeatedly:

1. **Check existing patterns** - Look at how similar functionality is implemented elsewhere in the codebase
2. **Simplify** - Try a simpler approach that still meets requirements
3. **Decompose** - Break the task into smaller sub-tasks that can be verified independently
4. **Consult PRD** - Re-read the PRD requirements; the approach may be over-engineered

## Team-Debugger Escalation

When standard recovery strategies are exhausted and agent-teams is available, escalate to hypothesis-driven parallel debugging using team-debuggers.

### Trigger Conditions

ALL of the following must be true:

1. **3+ failed recovery attempts** — Standard retry, alternative approach, and decomposition all failed
2. **Agent-teams available** — Detection protocol passes (see [../../shared/references/agent-teams-detection.md](../../shared/references/agent-teams-detection.md))
3. **Multi-file error** — The failure involves interactions between 2+ files (not a single-file syntax error)

### Escalation Protocol

1. **Formulate hypotheses** — Generate 2-3 competing hypotheses about the root cause:
   - Hypothesis A: [specific theory about what's wrong]
   - Hypothesis B: [alternative theory]
   - Hypothesis C: [third theory if applicable]

2. **Create debugging team:**
   ```
   TeamCreate(team_name="flow-debug-{issue_id}")
   ```

3. **Spawn team-debuggers** — One per hypothesis:
   ```
   Agent(
     subagent_type="agent-teams:team-debugger",
     name="debugger-{hypothesis_letter}",
     team_name="flow-debug-{issue_id}",
     prompt="Investigate hypothesis: {hypothesis_description}. Gather evidence to confirm or falsify."
   )
   ```

4. **Collect evidence** — Wait for all debuggers to report:
   - Each debugger returns: confidence level (High/Medium/Low), confirming evidence with file:line citations, contradicting evidence, and suggested fix

5. **Select winning hypothesis** — Choose the hypothesis with highest confidence and strongest evidence chain

6. **Apply fix** — Implement the suggested fix from the winning hypothesis

7. **Verify** — Run tests to confirm the fix resolves the original failure

8. **Cleanup:**
   ```
   TeamDelete()  // Clean up debugging team
   ```

### Fallback

If team-debugger escalation also fails (no hypothesis confirmed or fix doesn't work):

- Log detailed debugging results for user review
- Proceed to "Rollback Procedures" below
- If in autonomous mode: log the failure and continue with next task
- If in interactive mode: escalate to user with full evidence report

## Rollback Procedures

When an implementation introduces regressions:

1. **Identify the scope** - Determine which files were changed and which tests are now failing
2. **Check if partial rollback is possible** - Can you revert specific files while keeping others?
3. **Full rollback** - If the entire approach is flawed:
   - Commit current state with WIP message for reference
   - Revert to the last known good state
   - Re-approach the task with a different strategy
4. **Document the failure** - Add notes to the beads issue explaining what was tried and why it failed

## When to Escalate to User

Escalate to the user (in interactive mode) when:

1. **Ambiguous requirements** - The PRD does not specify behavior for a discovered edge case and multiple valid interpretations exist
2. **Architecture decision** - Multiple valid approaches exist with meaningful trade-offs that depend on user preferences
3. **Missing information** - Required API endpoints, schemas, or external dependencies are not documented
4. **Conflicting requirements** - Requirements contradict each other or conflict with existing code
5. **Persistent failures** - After 3+ attempts with different approaches, the task still fails
6. **Environment issues** - Missing tools, permissions, or infrastructure that the agent cannot provision

**In autonomous mode:** Do NOT escalate. Make reasonable decisions based on best practices, existing codebase patterns, simplest viable solution, and industry standards. Only stop for truly unrecoverable errors (e.g., missing credentials, infrastructure down).

## When to Stop for Clarification (Interactive Mode Only)

Present options using `AskUserQuestion` with:
- Clear description of the issue
- Multiple solution options with descriptions
- A recommended option when one is clearly better

```
AskUserQuestion({
  questions: [{
    question: "Clarification needed for task BD-123: [description of issue]",
    header: "Issue Category",
    options: [
      { label: "Option A", description: "Description of approach A" },
      { label: "Option B", description: "Description of approach B" },
      { label: "Skip task", description: "Move to next task, return to this later" }
    ],
    multiSelect: false
  }]
})
```
