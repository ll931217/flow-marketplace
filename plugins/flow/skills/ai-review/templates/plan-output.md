# Plan Output Template

This template defines the structure for the final human-readable plan output.

## Structure

```markdown
# Plan: {title}
> Goal: {goal}
> Iterations: {count}
> Convergence: {type}

## Summary
{summary}

## Steps
{steps}

### Step {number}: {title}
**Description:** {description}

**Dependencies:** {dependencies}
**Deliverables:** {deliverables}

---

*Repeat for each step*

## Accepted Assumptions
{accepted_assumptions}
- "Assumption 1"
- "Assumption 2"
- ...

## Run Summary
- **Run ID:** {run_id}
- **Total Iterations:** {iterations}
- **Convergence Reason:** {convergence_reason}
- **Final Score:** {final_score}
- **Critics Used:** {critics}
- **Conflicts Resolved:** {conflicts_resolved}
- **Questions Asked:** {questions_asked}

