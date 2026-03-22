#!/usr/bin/env python3
"""
Critique Aggregation for AI Multi-Agent Plan Review Engine.

Merges critiques from multiple critics:
- Deduplicates similar issues
- Normalizes severity across critics
- Flags conflict candidates
- Collapses duplicate suggestions
"""

import json
from typing import Any, Optional
from dataclasses import dataclass, field


@dataclass
class Issue:
    id: str
    source: str
    type: str
    severity: str
    description: str
    target: str
    suggestion: Optional[str] = None
    persistence_count: int = 0
    sources: list = field(default_factory=list)


SEVERITY_ORDER = ["critical", "high", "medium", "low"]


def severity_weight(severity: str) -> int:
    """Convert severity to numeric weight."""
    return SEVERITY_ORDER.index(severity) if severity in SEVERITY_ORDER else 0


def normalize_severity(severities: list[str]) -> str:
    """Return the highest severity from a list."""
    if not severities:
        return "low"
    weights = [severity_weight(s) for s in severities]
    return SEVERITY_ORDER[min(weights)]


def compute_issue_similarity(issue1: dict, issue2: dict) -> float:
    """Compute similarity score between two issues (0.0-1.0)."""
    score = 0.0

    # Same target is strong signal
    if issue1.get("target") == issue2.get("target"):
        score += 0.5

    # Similar type
    if issue1.get("type") == issue2.get("type"):
        score += 0.2

    # Description overlap (simple word overlap)
    words1 = set(issue1.get("description", "").lower().split())
    words2 = set(issue2.get("description", "").lower().split())
    if words1 and words2:
        overlap = len(words1 & words2) / max(len(words1), len(words2))
        score += overlap * 0.3

    return score


def aggregate_critiques(
    critiques: list[dict], previous_aggregated: Optional[dict] = None
) -> dict:
    """
    Aggregate multiple critic outputs into a single critique.

    Args:
        critiques: List of raw critique outputs from critics
        previous_aggregated: Previous iteration's aggregated critique (for persistence tracking)

    Returns:
        Aggregated critique with merged issues and conflict candidates
    """
    all_issues = []
    all_suggestions = []

    # Collect all issues and suggestions
    for critique in critiques:
        source = critique.get("source", "unknown")

        for issue in critique.get("issues", []):
            all_issues.append(
                {
                    "id": issue.get("id", f"issue_{len(all_issues)}"),
                    "source": source,
                    "type": issue.get("type", "general"),
                    "severity": issue.get("severity", "medium"),
                    "description": issue.get("description", ""),
                    "target": issue.get("target", ""),
                    "suggestion": issue.get("suggestion"),
                }
            )

        for suggestion in critique.get("suggestions", []):
            all_suggestions.append(
                {
                    "source": source,
                    "target": suggestion.get("target", ""),
                    "change": suggestion.get("change", ""),
                }
            )

    # Merge similar issues
    merged_issues = []
    used_indices = set()

    for i, issue in enumerate(all_issues):
        if i in used_indices:
            continue

        # Find similar issues
        similar_group = [issue]
        similar_sources = [issue["source"]]

        for j, other in enumerate(all_issues[i + 1 :], start=i + 1):
            if j in used_indices:
                continue
            similarity = compute_issue_similarity(issue, other)
            if similarity >= 0.6:  # Threshold for merging
                similar_group.append(other)
                similar_sources.append(other["source"])
                used_indices.add(j)

        used_indices.add(i)

        # Create merged issue
        merged_issue = {
            "id": f"agg_issue_{len(merged_issues)}",
            "source_issues": [iss["id"] for iss in similar_group],
            "sources": list(set(similar_sources)),
            "merged": len(similar_group) > 1,
            "type": issue["type"],
            "severity": normalize_severity([iss["severity"] for iss in similar_group]),
            "description": issue["description"],  # Use first description
            "target": issue["target"],
            "persistence_count": 0,
        }

        # Track persistence from previous iteration
        if previous_aggregated:
            for prev_issue in previous_aggregated.get("issues", []):
                if compute_issue_similarity(merged_issue, prev_issue) >= 0.7:
                    merged_issue["persistence_count"] = (
                        prev_issue.get("persistence_count", 0) + 1
                    )
                    break

        merged_issues.append(merged_issue)

    # Collapse duplicate suggestions
    collapsed_suggestions = []
    seen_targets = {}

    for suggestion in all_suggestions:
        target = suggestion["target"]
        if target not in seen_targets:
            seen_targets[target] = suggestion
            collapsed_suggestions.append(suggestion)
        else:
            # Merge changes if different
            existing = seen_targets[target]
            if existing["change"] != suggestion["change"]:
                existing["change"] = (
                    f"{existing['change']}; Alternative: {suggestion['change']}"
                )

    # Detect conflict candidates
    conflict_candidates = []

    for i, issue in enumerate(merged_issues):
        # Check for severity disagreement across sources
        if len(issue["sources"]) > 1:
            source_severities = {}
            for src_issue in all_issues:
                if src_issue["id"] in issue["source_issues"]:
                    src = src_issue["source"]
                    sev = src_issue["severity"]
                    if src not in source_severities:
                        source_severities[src] = sev
                    elif source_severities[src] != sev:
                        # Severity disagreement
                        conflict_candidates.append(
                            {
                                "issue_id": issue["id"],
                                "type": "severity_disagreement",
                                "sources": issue["sources"],
                                "details": f"Severity disagreement: {source_severities}",
                            }
                        )
                        break

        # Check for contradictory suggestions
        related_suggestions = [
            s for s in collapsed_suggestions if s["target"] == issue["target"]
        ]
        if len(related_suggestions) > 1:
            conflict_candidates.append(
                {
                    "issue_id": issue["id"],
                    "type": "contradictory_suggestions",
                    "sources": [s["source"] for s in related_suggestions],
                    "details": "Multiple conflicting suggestions for same target",
                }
            )

    # Rank issues deterministically
    def issue_score(issue: dict) -> float:
        sev_weight = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        return (
            sev_weight.get(issue["severity"], 1) * 1.0
            + issue["persistence_count"] * 1.5
        )

    merged_issues.sort(key=issue_score, reverse=True)

    return {
        "issues": merged_issues,
        "suggestions": collapsed_suggestions,
        "conflict_candidates": conflict_candidates,
        "stats": {
            "total_raw_issues": len(all_issues),
            "merged_issues": len(merged_issues),
            "conflicts_detected": len(conflict_candidates),
        },
    }


def select_top_issues(aggregated: dict, max_feedback: int = 5) -> list[dict]:
    """Select top N issues for Planner feedback."""
    return aggregated["issues"][:max_feedback]


if __name__ == "__main__":
    # Example usage
    example_critiques = [
        {
            "source": "implementation",
            "issues": [
                {
                    "id": "i1",
                    "type": "correctness",
                    "severity": "high",
                    "description": "Missing error handling",
                    "target": "step_2",
                },
                {
                    "id": "i2",
                    "type": "completeness",
                    "severity": "medium",
                    "description": "No rollback plan",
                    "target": "step_4",
                },
            ],
            "suggestions": [{"target": "step_2", "change": "Add try-catch block"}],
        },
        {
            "source": "security",
            "issues": [
                {
                    "id": "s1",
                    "type": "auth",
                    "severity": "critical",
                    "description": "No authentication check",
                    "target": "step_2",
                },
                {
                    "id": "s2",
                    "type": "data",
                    "severity": "high",
                    "description": "PII not encrypted",
                    "target": "step_3",
                },
            ],
            "suggestions": [{"target": "step_2", "change": "Add auth middleware"}],
        },
    ]

    result = aggregate_critiques(example_critiques)
    print(json.dumps(result, indent=2))
