---
name: review
description: Multi-dimensional code review using parallel team-reviewers after implementation. Analyzes security, performance, architecture, testing, and accessibility. Auto-fixes critical findings. Use after implementation is complete, before cleanup. This skill should be invoked when you need to review code, audit implementation, check quality, or verify the implementation before finalizing.
---

# Review

Multi-dimensional code review that analyzes implementation quality and auto-fixes critical findings.

## Quick Reference

**Usage:** `/flow:review`

**What this does:**
- Determines changed files from implementation (git diff against pre-implementation checkpoint)
- Categorizes files to select relevant review dimensions (2-4)
- When agent-teams available: spawns parallel team-reviewers (one per dimension)
- When agent-teams unavailable: runs sequential single-agent review
- Consolidates findings, deduplicates, and calibrates severity
- Auto-fixes Critical and High severity findings when possible
- Generates a consolidated review report

**Prerequisites:** Implementation phase complete (all tasks closed)

**Next:** Run `/flow:cleanup` to finalize the feature

**Full workflow:** plan → generate-tasks → implement → **review** → cleanup

## Quick Start

1. **Determine changed files** — Git diff against pre-implementation checkpoint or branch point
2. **Select review dimensions** — Based on file types (2-4 dimensions)
3. **Execute review** — Parallel team-reviewers (team mode) or sequential single-agent (standard mode)
4. **Consolidate findings** — Deduplicate, calibrate severity, generate report
5. **Auto-fix** — Remediate Critical and High findings when possible

**Prerequisites:** Implementation phase complete (all tasks closed in beads).

## Autonomous Mode

When invoked from `/flow:autonomous`, skip user confirmations and auto-fix all fixable findings.

See [../shared/references/autonomous-mode.md](../shared/references/autonomous-mode.md) for detection method and behavioral rules.

## Agent-Teams Detection

Check whether agent-teams is available to determine team vs standard review mode.

See [../shared/references/agent-teams-detection.md](../shared/references/agent-teams-detection.md) for the detection protocol.

## Review Workflow

Execute the multi-step review process including file categorization, dimension selection, reviewer execution, finding consolidation, and auto-fixing.

See [references/review-workflow.md](references/review-workflow.md) for:
- Changed file determination and categorization
- Dimension selection logic (security, performance, architecture, testing, accessibility)
- Team mode vs standard mode execution
- Finding deduplication and severity calibration
- Auto-fix patterns and protocol
- Report generation format

## Review Dimensions

| Dimension | Focus Areas |
|-----------|------------|
| **Security** | Input validation, auth, secrets, XSS, SQL injection, CSRF, dependencies |
| **Performance** | N+1 queries, memory leaks, caching, algorithm complexity, bundle size |
| **Architecture** | SOLID principles, separation of concerns, dependency direction, API contracts |
| **Testing** | Coverage gaps, test isolation, edge cases, mock quality, assertion specificity |
| **Accessibility** | WCAG 2.1 AA, semantic HTML, keyboard navigation, screen reader, color contrast |

## State Management

Update flow state when entering review phase:

```bash
bash "${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh" phase review
```

If using team mode, store review team info:

```bash
bash "${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh" set 'team_state.review_team="flow-review-{session_id}"'
```

## Output Format

```
Review Complete!

PRD: prd-[feature]-vN.md
  Files reviewed: X
  Dimensions: security, performance, architecture

Findings:
  Critical: N (auto-fixed: M)
  High: N (auto-fixed: M)
  Medium: N
  Low: N

Next steps:
  Run /flow:cleanup to finalize the feature
```

## Final Instructions

Use ULTRATHINK for severity calibration and auto-fix decisions. Prioritize fixing Critical findings first, then High. Medium and Low findings are reported but not auto-fixed.

**Critical Rules:**
- Maximum 4 review dimensions per review
- Each reviewer stays within their assigned dimension
- Auto-fix only Critical and High findings
- Run tests after each auto-fix to prevent regressions
- If auto-fix introduces a regression, revert it immediately
- Report all findings regardless of auto-fix status
