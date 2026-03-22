#!/usr/bin/env python3
"""
Judge Agent - Uses Claude Agent SDK for evaluation and conflict resolution.
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Optional

try:
    from claude_agent_sdk import query, ClaudeAgentOptions
except ImportError:
    pass

SKILL_DIR = Path(__file__).parent.parent.parent / "agents"


def load_judge_prompt() -> str:
    """Load the judge agent prompt from file."""
    prompt_path = SKILL_DIR / "agents" / "judge.md"
    return prompt_path.read_text()


async def run_judge(
    plan: dict,
    aggregated_critique: dict,
    iteration: int,
) -> dict:
    """
    Run the judge agent to evaluate a plan and resolve conflicts.

    Args:
        plan: The plan to evaluate
        aggregated_critique: The aggregated critique from critics
        iteration: Current iteration number

    Returns:
        Evaluation with scores, blocking issues, and convergence status
    """
    try:
        from claude_agent_sdk import query, ClaudeAgentOptions
    except ImportError:
        raise ImportError(
            "claude-agent-sdk not installed. Install with: pip install claude-agent-sdk"
        )

    prompt = load_judge_prompt()

    # Format prompt with context
    formatted_prompt = prompt.replace("{{plan}}", json.dumps(plan, indent=2))
    formatted_prompt = formatted_prompt.replace(
        "{{aggregated_critique}}", json.dumps(aggregated_critique, indent=2)
    )
    formatted_prompt = formatted_prompt.replace("{{iteration}}", str(iteration))

    # Run agent
    result = None
    async for message in query(
        prompt=formatted_prompt,
        options=ClaudeAgentOptions(
            allowed_tools=["Read"],
            permission_mode="acceptEdits",
        ),
    ):
        if hasattr(message, "result"):
            result = json.loads(message.result)
            break

    if result is None:
        raise RuntimeError("Judge agent did not return a result")

    # Parse evaluation
    evaluation = json.loads(result)

    # Validate required fields
    required_fields = ["scores", "blocking_issues", "confidence"]
    for field in required_fields:
        if field not in evaluation:
            raise ValueError(f"Judge output missing required field: {field}")

    return evaluation


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run judge agent")
    parser.add_argument("--plan", required=True, help="Path to plan JSON")
    parser.add_argument(
        "--critique", required=True, help="Path to aggregated critique JSON"
    )
    parser.add_argument("--iteration", type=int, default=1, help="Iteration number")
    parser.add_argument("--output", help="Path to output JSON")

    args = parser.parse_args()

    with open(args.plan) as f:
        plan_data = json.load(f)
    with open(args.critique) as f:
        critique_data = json.load(f)

    async def main():
        result = await run_judge(
            plan=plan_data,
            aggregated_critique=critique_data,
            iteration=args.iteration,
        )

        if args.output:
            with open(args.output, "w") as f:
                json.dump(result, f, indent=2)
        else:
            print(json.dumps(result, indent=2))

    asyncio.run(main())
