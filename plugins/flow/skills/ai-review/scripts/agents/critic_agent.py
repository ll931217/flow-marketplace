#!/usr/bin/env python3
"""
Critic Agents - Uses OpenAI Agents SDK for parallel critique.
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Optional

try:
    from agents import Agent, Runner
except ImportError:
    pass

SKILL_DIR = Path(__file__).parent.parent.parent / "agents"


def load_critic_prompt(critic_type: str) -> str:
    """Load the appropriate critic prompt based on type."""
    prompt_path = SKILL_DIR / "agents" / f"critic-{critic_type}.md"
    if not prompt_path.exists():
        raise FileNotFoundError(f"Critic prompt not found: {prompt_path}")
    return prompt_path.read_text()


async def run_critic(
    critic_type: str,
    plan: dict,
    goal: str,
) -> dict:
    """
    Run a single critic agent.

    Args:
        critic_type: Type of critic (implementation, security, performance)
        plan: The plan to analyze
        goal: The original user goal

    Returns:
        Critique output with issues and suggestions
    """
    prompt = load_critic_prompt(critic_type)

    # Format prompt with context
    formatted_prompt = prompt.replace("{{plan}}", json.dumps(plan, indent=2))
    formatted_prompt = formatted_prompt.replace("{{goal}}", goal)

    try:
        from agents import Agent, Runner
    except ImportError:
        raise ImportError(
            "openai-agents not installed. Install with: pip install openai-agents"
        )

    # Create agent
    agent = Agent(
        name=f"critic-{critic_type}",
        instructions=formatted_prompt,
    )

    # Run agent
    result = await Runner.run(agent, "Analyze the plan and return your critique.")

    # Parse result
    critique_data = json.loads(result.final_output)

    # Validate output schema
    if "issues" not in critique_data or "suggestions" not in critique_data:
        raise ValueError(f"Critic output missing required fields")

    return critique_data


async def run_all_critics(
    plan: dict,
    goal: str,
    critic_types: Optional[list] = None,
) -> list[dict]:
    """
    Run all critic agents in parallel.

    Args:
        plan: The plan to analyze
        goal: The original user goal
        critic_types: List of critic types to run (default: all)

    Returns:
        List of critiques from each critic
    """
    if critic_types is None:
        critic_types = ["implementation", "security", "performance"]

    tasks = [run_critic(ct, plan, goal) for ct in critic_types]
    results = await asyncio.gather(*tasks)
    return list(results)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run critic agents")
    parser.add_argument("--plan", required=True, help="Path to plan JSON")
    parser.add_argument("--goal", required=True, help="User goal")
    parser.add_argument(
        "--critics",
        nargs="+",
        default=["implementation", "security", "performance"],
        help="Critic types to run",
    )
    parser.add_argument("--output", help="Path to output JSON")

    args = parser.parse_args()

    with open(args.plan) as f:
        plan_data = json.load(f)

    async def main():
        results = await run_all_critics(
            plan=plan_data,
            goal=args.goal,
            critic_types=args.critics,
        )

        output = {"critiques": results}

        if args.output:
            with open(args.output, "w") as f:
                json.dump(output, f, indent=2)
        else:
            print(json.dumps(output, indent=2))

    asyncio.run(main())
