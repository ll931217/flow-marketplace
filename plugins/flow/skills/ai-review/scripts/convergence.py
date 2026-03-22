#!/usr/bin/env python3
"""
Convergence Detection for AI Multi-Agent Plan Review Engine.

Implements threshold and delta convergence detection with:
- Weighted score calculation
- Minimum threshold checking
- Delta stall detection
- Persistence tracking
- Confidence decay
"""

import json
from typing import Optional, Tuple
from dataclasses import dataclass

# Scoring weights
WEIGHTS = {
    "correctness": 0.30,
    "completeness": 0.20,
    "feasibility": 0.20,
    "clarity": 0.10,
    "efficiency": 0.10,
    "risk": 0.10,
}

# Minimum thresholds
MIN_THRESHOLDS = {"correctness": 0.85, "feasibility": 0.80}


@dataclass
class ConvergenceResult:
    converged: bool
    reason: str
    convergence_type: Optional[str] = None
    details: Optional[dict] = None


def calculate_weighted_score(scores: dict) -> float:
    """Calculate weighted score from individual metric scores."""
    total = 0.0
    for metric, weight in WEIGHTS.items():
        total += scores.get(metric, 0.0) * weight
    return round(total, 4)


def check_minimum_thresholds(scores: dict) -> Tuple[bool, list[str]]:
    """Check if all minimum thresholds are met."""
    failures = []
    for metric, minimum in MIN_THRESHOLDS.items():
        if scores.get(metric, 0.0) < minimum:
            failures.append(f"{metric} ({scores.get(metric, 0.0):.2f} < {minimum})")
    return len(failures) == 0, failures


def calculate_score_delta(history: list[dict]) -> float:
    """Calculate score delta between last 2 iterations."""
    if len(history) < 2:
        return 1.0

    current = history[-1].get("evaluation", {}).get("weightedScore", 0)
    previous = history[-2].get("evaluation", {}).get("weightedScore", 0)

    return abs(current - previous)


def detect_new_issues(current_issues: list, previous_issues: list) -> list:
    """Detect issues that weren't in the previous iteration."""
    current_ids = {i.get("id") for i in current_issues}
    previous_ids = {i.get("id") for i in previous_issues}
    return list(current_ids - previous_ids)


def apply_confidence_decay(
    confidence: float, iteration: int, delta: float
) -> Tuple[float, bool]:
    """Apply confidence decay if stalled after iteration 3."""
    decay_applied = False
    if iteration >= 3 and delta < 0.05:
        decay_factor = 1 - 0.05 * (iteration - 3)
        confidence = confidence * decay_factor
        decay_applied = True
    return confidence, decay_applied


def check_convergence(
    evaluation: dict,
    plan: dict,
    history: list[dict],
    target_score: float = 0.90,
    iteration: int = 0,
    max_iterations: int = 5,
) -> ConvergenceResult:
    """
    Check if the plan has converged.

    Args:
        evaluation: Current evaluation with scores and blocking_issues
        plan: Current plan with assumptions
        history: List of previous iteration history entries
        target_score: Target weighted score for convergence
        iteration: Current iteration number
        max_iterations: Maximum allowed iterations

    Returns:
        ConvergenceResult with convergence status and reason
    """
    scores = evaluation.get("scores", {})
    weighted_score = calculate_weighted_score(scores)

    # Store calculated weighted score back
    evaluation["weightedScore"] = weighted_score

    # Check minimum thresholds
    thresholds_met, threshold_failures = check_minimum_thresholds(scores)

    # Check blocking issues
    blocking_issues = evaluation.get("blocking_issues", [])
    critical_assumptions = plan.get("assumptions", {}).get("critical", [])

    # 1. Threshold Convergence (hard acceptance)
    if (
        weighted_score >= target_score
        and thresholds_met
        and len(blocking_issues) == 0
        and len(critical_assumptions) == 0
    ):
        return ConvergenceResult(
            converged=True,
            reason=f"Target score met: {weighted_score:.2f} >= {target_score}",
            convergence_type="threshold",
            details={
                "weighted_score": weighted_score,
                "scores": scores,
                "target_score": target_score,
            },
        )

    # 2. Delta Convergence (stall detection)
    if len(history) >= 2:
        delta = calculate_score_delta(history)

        if delta < 0.01:
            # Check for new issues
            current_issues = (
                history[-1].get("aggregated_critique", {}).get("issues", [])
            )
            previous_issues = (
                history[-2].get("aggregated_critique", {}).get("issues", [])
            )
            new_issues = detect_new_issues(current_issues, previous_issues)

            if len(new_issues) == 0:
                return ConvergenceResult(
                    converged=True,
                    reason=f"Delta stall detected: {delta:.4f} < 0.01, no new issues",
                    convergence_type="delta",
                    details={
                        "delta": delta,
                        "weighted_score": weighted_score,
                        "iterations": iteration,
                    },
                )

    # 3. Hard Stop (max iterations)
    if iteration >= max_iterations:
        return ConvergenceResult(
            converged=True,
            reason=f"Max iterations reached: {iteration} >= {max_iterations}",
            convergence_type="max_iterations",
            details={
                "iteration": iteration,
                "max_iterations": max_iterations,
                "weighted_score": weighted_score,
            },
        )

    # Not converged - continue iterating
    reasons = []
    if weighted_score < target_score:
        reasons.append(f"score {weighted_score:.2f} < {target_score}")
    if not thresholds_met:
        reasons.append(f"threshold failures: {threshold_failures}")
    if blocking_issues:
        reasons.append(f"{len(blocking_issues)} blocking issues")
    if critical_assumptions:
        reasons.append(f"{len(critical_assumptions)} critical assumptions")

    return ConvergenceResult(
        converged=False,
        reason="Not converged: " + "; ".join(reasons),
        convergence_type=None,
        details={
            "weighted_score": weighted_score,
            "thresholds_met": thresholds_met,
            "blocking_issues_count": len(blocking_issues),
            "critical_assumptions_count": len(critical_assumptions),
        },
    )


def track_persistence(
    current_issues: list[dict], previous_issues: list[dict], current_plan: dict
) -> list[dict]:
    """
    Track issue persistence and escalate severity.

    Returns updated issues with persistence_count and escalated severity.
    """

    def issue_similar(iss1: dict, iss2: dict) -> bool:
        """Check if two issues are similar."""
        return iss1.get("target") == iss2.get("target") and iss1.get(
            "type"
        ) == iss2.get("type")

    def issue_addressed(issue: dict, plan: dict) -> bool:
        """Check if an issue has been addressed in the plan."""
        # Simple check - in practice would be more sophisticated
        target = issue.get("target", "")
        plan_text = json.dumps(plan).lower()
        return issue.get("description", "").lower()[:20] in plan_text

    updated_issues = []

    for issue in current_issues:
        updated_issue = issue.copy()

        # Find matching previous issue
        for prev_issue in previous_issues:
            if issue_similar(issue, prev_issue):
                if not issue_addressed(issue, current_plan):
                    updated_issue["persistence_count"] = (
                        prev_issue.get("persistence_count", 0) + 1
                    )

                    # Escalate severity
                    pc = updated_issue["persistence_count"]
                    if pc >= 2:
                        sev = issue.get("severity", "medium")
                        if sev == "high":
                            updated_issue["severity"] = "critical"
                        elif sev == "medium":
                            updated_issue["severity"] = "high"

                    # Block after 3 iterations
                    if pc >= 3:
                        updated_issue["blocking"] = True

                    break

        updated_issues.append(updated_issue)

    return updated_issues


if __name__ == "__main__":
    # Example usage
    evaluation = {
        "scores": {
            "correctness": 0.88,
            "completeness": 0.85,
            "feasibility": 0.82,
            "clarity": 0.90,
            "efficiency": 0.85,
            "risk": 0.80,
        },
        "blocking_issues": [],
    }

    plan = {"assumptions": {"critical": []}}

    history = [
        {"evaluation": {"weightedScore": 0.65}},
        {"evaluation": {"weightedScore": 0.78}},
    ]

    weighted = calculate_weighted_score(evaluation["scores"])
    print(f"Weighted score: {weighted}")

    result = check_convergence(
        evaluation=evaluation,
        plan=plan,
        history=history,
        target_score=0.90,
        iteration=2,
        max_iterations=5,
    )

    print(f"Converged: {result.converged}")
    print(f"Reason: {result.reason}")
    print(f"Type: {result.convergence_type}")
