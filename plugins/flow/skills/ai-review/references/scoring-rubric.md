# Scoring Rubric

This document defines the weighted scoring criteria for plan evaluation.

## Weight Distribution

| Metric| Weight | Minimum Threshold |
|--------|--------|-------------------|
| Correctness| 30%    | ≥ 0.85|
| Completeness| 20%    | - |
| Feasibility  | 20%    | ≥ 0.80|
| Clarity      | 10%    | - |
| Efficiency   | 10%    | - |
| Risk         | 10%    | - |

## Weighted Score Calculation

```python
weighted_score = (
    scores.correctness * 0.30 +
    scores.completeness * 0.20 +
    scores.feasibility * 0.20 +
    scores.clarity * 0.10 +
    scores.efficiency * 0.10 +
    scores.risk * 0.10
)
```

**Note:** Weighted score is computed by the Orchestrator, NOT by the LLM.

## Metric Definitions

### 1. Correctness (30%)
Are the steps logically correct and complete?

**Scoring Guide:**
- 0.9-1.0: All steps logically sound, no gaps in reasoning
- 0.7-0.9: Minor logical issues, mostly correct
- 0.5-0.7: Some logical gaps, needs refinement
- 0.3-0.5: Significant logical errors
- 0.0-0.3: Fundamentally flawed logic

**Check:**
- [ ] Steps are in logical order
- [ ] Dependencies are correctly identified
- [ ] No circular dependencies
- [ ] Each step is actionable

### 2. Completeness (20%)
Does this address all requirements from the goal?

**Scoring Guide:**
- 0.9-1.0: All requirements explicitly addressed
- 0.7-0.9: Most requirements addressed, minor gaps
- 0.5-0.7: Some requirements missing
- 0.3-0.5: Significant requirements missing
- 0.0-0.3: Does not address the goal

**Check:**
- [ ] All explicit requirements covered
- [ ] Implicit requirements considered
- [ ] Edge cases addressed
- [ ] Error handling included

### 3. Feasibility (20%)
Can this be implemented with available resources?

**Scoring Guide:**
- 0.9-1.0: Fully implementable with current resources
- 0.7-0.9: Minor resource constraints, workable
- 0.5-0.7: Notable constraints, needs adjustment
- 0.3-0.5: Significant feasibility concerns
- 0.0-0.3: Not implementable

**Check:**
- [ ] Technical feasibility confirmed
- [ ] Resource availability verified
- [ ] Timeline realistic
- [ ] Dependencies resolvable

### 4. Clarity (10%)
Is the plan clear and unambiguous?

**Scoring Guide:**
- 0.9-1.0: Crystal clear, no ambiguity
- 0.7-0.9: Mostly clear, minor ambiguities
- 0.5-0.7: Some unclear aspects
- 0.3-0.5: Significant clarity issues
- 0.0-0.3: Very unclear

**Check:**
- [ ] Steps are well-defined
- [ ] Deliverables are specific
- [ ] No vague language
- [ ] Success criteria clear

### 5. Efficiency (10%)
Is the approach efficient?

**Scoring Guide:**
- 0.9-1.0: Optimal approach, no waste
- 0.7-0.9: Efficient with minor improvements possible
- 0.5-0.7: Some inefficiency
- 0.3-0.5: Significant inefficiency
- 0.0-0.3: Very inefficient

**Check:**
- [ ] No redundant steps
- [ ] Parallelization opportunities identified
- [ ] Resources used optimally
- [ ] No over-engineering

### 6. Risk (10%)
Are risks identified and mitigated?

**Scoring Guide:**
- 0.9-1.0: All risks identified with mitigations
- 0.7-0.9: Most risks addressed
- 0.5-0.7: Some risk mitigation
- 0.3-0.5: Risks identified but not mitigated
- 0.0-0.3: Risks not addressed

**Check:**
- [ ] Technical risks identified
- [ ] Mitigation strategies provided
- [ ] Fallback plans exist
- [ ] Dependencies have backup plans

## Acceptance Conditions

A plan is accepted ONLY if ALL of the following are true:

1. `weightedScore ≥ target_score` (default: 0.90)
2. `correctness ≥ 0.85`
3. `feasibility ≥ 0.80`
4. `blocking_issues` is empty
5. `assumptions.critical` is empty

## Confidence Decay

If the system has run ≥ 3 iterations with delta convergence conditions approaching but threshold not met:

```python
if iteration >= 3:
    confidence = raw_confidence * (1 - 0.05 * (iteration - 3))
```

This prevents inflated confidence on stalled runs.

## Information Hiding

- **Planner** cannot see scoring rules or evaluation output
- **Critics** cannot output scores or reference the rubric
- **Judge** has full visibility of rubric and all aggregated critique
