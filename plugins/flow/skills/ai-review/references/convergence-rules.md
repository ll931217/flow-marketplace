# Convergence Rules

This document defines the convergence detection logic for the iteration loop.

## Convergence Types

### 1. Threshold Convergence (Hard Acceptance)

The plan is accepted when ALL conditions are met:

| Condition | Requirement |
|-----------|-------------|
| Weighted Score | ≥ target_score (default: 0.90) |
| Correctness | ≥ 0.85 |
| Feasibility | ≥ 0.80 |
| Blocking Issues | Empty |
| Critical Assumptions | Empty |

**Result:** Plan is finalized with status `completed`.

### 2. Delta Convergence (Stall Detection)

Detects when the system is making minimal progress:

| Condition | Requirement |
|-----------|-------------|
| Score Delta | < 0.01 over last 2 iterations |
| New Issues | None introduced in last iteration |

**Result:** Plan is finalized with best version, status `completed`, convergence_reason=`delta`.

This prevents infinite micro-polishing loops.

### 3. Hard Stop

Maximum iterations reached:

| Condition | Requirement |
|-----------|-------------|
| Iterations | ≥ max_iterations (default: 5) |

**Result:** Exit with best plan, status `completed`, convergence_reason=`max_iterations`.

## Delta Calculation

```python
def calculate_delta(history):
    if len(history) < 2:
        return 1.0  # No delta yet
    
    current_score = history[-1]["evaluation"]["weightedScore"]
    previous_score = history[-2]["evaluation"]["weightedScore"]
    
    return abs(current_score - previous_score)
```

## Convergence Detection Algorithm

```python
def check_convergence(state):
    evaluation = state["history"][-1]["evaluation"]
    
    # Threshold convergence
    if (
        evaluation["weightedScore"] >= state["target_score"]
        and evaluation["scores"]["correctness"] >= 0.85
        and evaluation["scores"]["feasibility"] >= 0.80
        and len(evaluation["blocking_issues"]) == 0
        and len(state["plan"]["assumptions"]["critical"]) == 0
    ):
        return "threshold", "Target score and all conditions met"
    
    # Delta convergence (stall detection)
    delta = calculate_delta(state["history"])
    if delta < 0.01 and len(state["history"]) >= 2:
        # Check for new issues
        current_issues = set(i["id"] for i in state["history"][-1]["aggregated_critique"]["issues"])
        previous_issues = set(i["id"] for i in state["history"][-2]["aggregated_critique"]["issues"])
        new_issues = current_issues - previous_issues
        
        if len(new_issues) == 0:
            return "delta", f"Score delta {delta:.4f} < 0.01, no new issues"
    
    # Hard stop
    if state["iteration"] >= state["max_iterations"]:
        return "max_iterations", f"Reached max iterations ({state['max_iterations']})"
    
    return None, None
```

## Persistence Tracking

Issues that persist across iterations are escalated:

```python
def track_persistence(current_issues, previous_issues):
    for issue in current_issues:
        # Find matching issue in previous iteration
        prev_match = find_similar_issue(issue, previous_issues)
        
        if prev_match and not issue_addressed(issue, current_plan):
            issue["persistence_count"] = prev_match.get("persistence_count", 0) + 1
            
            # Escalate severity
            if issue["persistence_count"] >= 2:
                if issue["severity"] == "high":
                    issue["severity"] = "critical"
                elif issue["severity"] == "medium":
                    issue["severity"] = "high"
            
            # Block after 3 iterations
            if issue["persistence_count"] >= 3:
                issue["blocking"] = True
```

## Confidence Decay

After iteration 3, if delta is approaching stall:

```python
def apply_confidence_decay(evaluation, iteration):
    if iteration >= 3:
        delta = calculate_delta(history)
        if delta < 0.05:  # Approaching stall
            decay_factor = 1 - 0.05 * (iteration - 3)
            evaluation["confidence"] *= decay_factor
            evaluation["confidence_decay_applied"] = True
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Completed successfully (threshold convergence) |
| 0 | Completed with delta convergence |
| 1 | Paused (awaiting user input) |
| 2 | Fatal error |
| 3 | Budget exceeded |
| 4 | Max iterations reached |

## Convergence Summary

When converged, the `report.json` includes:

```json
{
  "convergence_reason": "threshold|delta|max_iterations",
  "final_score": 0.93,
  "iterations": 3,
  "score_progression": [0.65, 0.82, 0.93]
}
```
