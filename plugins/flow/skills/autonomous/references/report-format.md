# Report Format

Template and structure for the Maestro implementation report generated at the end of autonomous execution.

## Report Location

```
.flow/maestro/sessions/<session-id>/final-report.md
```

## Report Template

```markdown
# Maestro Implementation Report

## Summary
- Feature: {feature_description}
- Duration: {total_duration}
- Tasks Completed: {completed}/{total}
- Tests Passed: {passed}/{total_tests}
- Checkpoints: {checkpoint_count}

## Decisions Made

### Technology Stack
- {tech_category}: {decision} ({rationale})
- {tech_category}: {decision} ({rationale})
- {tech_category}: {decision} ({rationale})

### Architecture
- Pattern: {pattern_name}
- Route Structure: {route_description}
- Frontend: {frontend_approach}

### Task Ordering
1. {task_group_1} ({reason})
2. {task_group_2} ({reason})
3. {task_group_3} ({reason})

## Changes Made

### Files Modified: {count}
- {file_path} (+{added} lines, -{removed} lines)
- {file_path} (+{added} lines, -{removed} lines)

### Files Created: {count}
- {file_path}
- {file_path}

## Testing
- Unit Tests: {unit_passed} passed
- Integration Tests: {integration_passed} passed
- Coverage: {coverage_percent}%

## Quality Gates
- ESLint: {errors} errors, {warnings} warnings
- TypeScript: {type_status}
- Security Audit: {security_status}

## Checkpoints
- commit {sha}: {message}
- commit {sha}: {message}

## Errors Recovered
- {error_description}: {recovery_strategy} -> {outcome}

## Next Steps
- Review implementation
- Run manual testing if desired
- Merge to main when ready
```

## Section Details

### Summary

High-level statistics for the implementation session:
- **Feature**: the original feature request text
- **Duration**: wall clock time from start to completion
- **Tasks Completed**: ratio of completed tasks to total
- **Tests Passed**: ratio of passing tests to total
- **Checkpoints**: number of git checkpoints created

### Decisions Made

All technical decisions made by the decision engine, grouped by:
- **Technology Stack**: libraries, frameworks, tools selected with rationale
- **Architecture**: patterns chosen, route structures, component design
- **Task Ordering**: execution sequence with dependency reasoning

### Changes Made

Git diff summary:
- **Files Modified**: existing files changed, with line counts
- **Files Created**: new files added to the codebase

### Testing

Test execution results:
- **Unit Tests**: count of passing unit tests
- **Integration Tests**: count of passing integration tests
- **Coverage**: overall code coverage percentage

### Quality Gates

Results from automated quality checks:
- **ESLint** (or project linter): error and warning counts
- **TypeScript**: type checking status
- **Security Audit**: vulnerability scan results

### Checkpoints

Git commits created during implementation, listed chronologically with SHA and message.

### Errors Recovered

Any errors encountered during execution and how they were resolved:
- Error description
- Recovery strategy applied
- Final outcome

### Next Steps

Recommended actions after reviewing the report. Always includes:
- Review implementation code
- Run manual testing if desired
- Merge to main when ready

## Status Values

The report uses these status indicators:
- `passed` / `failed` for tests
- `0 errors` / `N errors` for lint
- `No type errors` / `N type errors` for TypeScript
- `0 vulnerabilities` / `N vulnerabilities` for security
