#!/usr/bin/env python3
"""
Planner Agent - Uses Claude Agent SDK for plan generation and refinement.
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Optional

SKILL_DIR = Path(__file__).parent.parent.parent / "agents"


def load_planner_prompt() -> str:
    """Load the planner agent prompt from file."""
    prompt_path = SKILL_DIR / "agents" / "planner.md"
    return prompt_path.read_text()


async def run_planner(
    goal: str,
    iteration: int,
    previous_plan: Optional[dict] = None,
    aggregated_critique: Optional[dict] = None,
    user_answers: Optional[list] = None,
) -> dict:
    """
    Run the planner agent to generate or refine a plan.

    Args:
        goal: The user's goal
        iteration: Current iteration number
        previous_plan: Previous plan (for refinement)
        aggregated_critique: Aggregated critique (for refinement)
        user_answers: User answers from previous questions

    Returns:
        Plan with steps and questions
    """
    try:
        from claude_agent_sdk import query, ClaudeAgentOptions
    except ImportError:
        raise ImportError(
            "claude-agent-sdk not installed. Install with: pip install claude-agent-sdk"
        )

    prompt = load_planner_prompt()

    # Build context sections
    context_parts = []
    context_parts.append(f"Goal: {goal}")
    context_parts.append(f"Iteration: {iteration}")

    if previous_plan:
        context_parts.append(f"Previous Plan:\n{json.dumps(previous_plan, indent=2)}")
    if aggregated_critique:
        context_parts.append(
            f"Aggregated Critique:\n{json.dumps(aggregated_critique, indent=2)}"
        )
    if user_answers:
        context_parts.append(f"User Answers:\n{json.dumps(user_answers, indent=2)}")

    context_str = "\n\n".join(context_parts)

    # Format prompt with context
    formatted_prompt = prompt.replace("{{goal}}", goal)
    formatted_prompt = formatted_prompt.replace("{{iteration}}", str(iteration))

    prev_plan_str = (
        "null" if previous_plan is None else json.dumps(previous_plan, indent=2)
    )
    formatted_prompt = formatted_prompt.replace("{{previous_plan}}", prev_plan_str)

    critique_str = (
        "null"
        if aggregated_critique is None
        else json.dumps(aggregated_critique, indent=2)
    )
    formatted_prompt = formatted_prompt.replace("{{aggregated_critique}}", critique_str)

    answers_str = "null" if user_answers is None else json.dumps(user_answers, indent=2)
    formatted_prompt = formatted_prompt.replace("{{user_answers}}", answers_str)

    # Combine prompt with context
    full_prompt = f"{formatted_prompt}\n\n### Current Context\n\n{context_str}"

    # Run agent
    result = None
    async for message in query(
        prompt=full_prompt,
        options=ClaudeAgentOptions(
            allowed_tools=["Read"],
            permission_mode="acceptEdits",
        ),
    ):
        if hasattr(message, "result"):
            result = json.loads(message.result)
            break

    if result is None:
        raise RuntimeError("Planner agent did not return a result")

    # Parse plan and questions
    plan_data = json.loads(result)

    # Validate output schema
    if "plan" not in plan_data:
        raise ValueError("Planner output missing 'plan' key")

    return plan_data


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run planner agent")
    parser.add_argument("--goal", required=True, help="User goal")
    parser.add_argument("--iteration", type=int, default=1, help="Iteration number")
    parser.add_argument("--previous-plan", help="Path to previous plan JSON")
    parser.add_argument("--critique", help="Path to aggregated critique JSON")
    parser.add_argument("--answers", help="Path to user answers JSON")
    parser.add_argument("--output", help="Path to output JSON")

    args = parser.parse_args()

    previous_plan = None
    if args.previous_plan:
        with open(args.previous_plan) as f:
            previous_plan = json.load(f)

    critique = None
    if args.critique:
        with open(args.critique) as f:
            critique = json.load(f)

    answers = None
    if args.answers:
        with open(args.answers) as f:
            answers = json.load(f)

    async def main():
        result = await run_planner(
            goal=args.goal,
            iteration=args.iteration,
            previous_plan=previous_plan,
            aggregated_critique=critique,
            user_answers=answers,
        )

        if args.output:
            with open(args.output, "w") as f:
                json.dump(result, f, indent=2)
        else:
            print(json.dumps(result, indent=2))

    asyncio.run(main())
