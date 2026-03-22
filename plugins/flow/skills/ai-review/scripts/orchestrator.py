#!/usr/bin/env python3
"""
Main Orchestrator for AI Multi-Agent Plan Review Engine.

Coordinates the iteration loop between Planner, Critics, and Judge agents.
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))
from state_manager import StateManager, create_run, load_run
from aggregation import aggregate_critiques, select_top_issues
from convergence import check_convergence, track_persistence
from agents.planner_agent import run_planner
from agents.critic_agent import run_all_critics
from agents.judge_agent import run_judge


def compute_plan_diff(
    previous_plan: Optional[Dict], current_plan: Dict
) -> Dict:
    """Compute diff between two plan versions."""
    if previous_plan is None:
        return {"added_steps": [], "removed_steps": [], "modified_steps": []}
    
    previous_steps = {s["id"]: s for s in previous_plan.get("steps", [])}
    current_steps = {s["id"]: s for s in current_plan.get("steps", [])}
    
    added = []
    removed = []
    modified = []
    
    current_ids = set(current_steps.keys())
    previous_ids = set(previous_steps.keys())
    
    for step_id in current_ids - previous_ids:
        added.append(step_id)
    
    for step_id in previous_ids - current_ids:
        removed.append(step_id)
    
    for step_id in current_ids & previous_ids:
        prev_step = previous_steps[step_id]
        curr_step = current_steps[step_id]
        if json.dumps(prev_step) != json.dumps(curr_step):
            modified.append({
                "id": step_id,
                "before": prev_step.get("description"),
                "after": curr_step.get("description")
            })
    
    return {
        "added_steps": added,
        "removed_steps": removed,
        "modified_steps": modified
    }


async def run_iteration(
    manager: StateManager,
    critic_types: Optional[List[str]] = None,
    max_feedback: int = 5
) -> Optional[tuple[Dict, Dict, Dict, Dict]]:
    """
    Run a single iteration of the review loop.
    
    Args:
        manager: StateManager instance
        critic_types: List of critic types to run
        max_feedback: Maximum issues to pass in planner
    
    Returns:
        Tuple of (plan, aggregated_critique, evaluation, history_entry)
        Returns None if paused for user input.
    """
    state = manager.read_state()
    if state is None:
        raise ValueError("No state found")
    
    iteration = state["iteration"]
    
    print(f"\n=== Iteration {iteration} ===")
    
    # 1. Planner
    print("Step 1: Running Planner...")
    manager.set_step("plan_generation")
    
    previous_plan = None
    aggregated_critique = None
    user_answers = state.get("user_answers") if state.get("user_answers") else None
    
    if iteration > 0 and state.get("history"):
        last_entry = state["history"][-1]
        previous_plan = last_entry.get("plan_snapshot")
        aggregated_critique = last_entry.get("aggregated_critique")
    
    plan_result = await run_planner(
        goal=state["goal"],
        iteration=iteration,
        previous_plan=previous_plan,
        aggregated_critique=aggregated_critique,
        user_answers=user_answers,
    )
    
    if plan_result is None:
        raise RuntimeError("Planner returned no result")
    
    plan = plan_result.get("plan")
    if plan is None:
        raise ValueError("Planner returned no plan")
    
    # Check for blocking questions
    questions = plan_result.get("questions", [])
    if questions:
        blocking = [q for q in questions if q.get("blocking")]
        if blocking:
            manager.update_state({
                "pending_questions": questions,
                "plan": plan
            })
            manager.set_status("paused")
            print(f"\nPaused: {len(blocking)} blocking questions need answers.")
            print("Run: resume with --answers <file>")
            return None
    
    # 2. Critics (parallel)
    print("\nStep 2: Running Critics in parallel...")
    manager.set_step("critique")
    
    if critic_types is None:
        critic_types = ["implementation", "security", "performance"]
    
    critiques = await run_all_critics(
        plan=plan,
        goal=state["goal"],
        critic_types=critic_types,
    )
    
    # 3. Aggregation
    print("\nStep 3: Aggregating critiques...")
    previous_aggregated = None
    if state.get("history"):
        previous_aggregated = state["history"][-1].get("aggregated_critique")
    
    aggregated = aggregate_critiques(critiques, previous_aggregated)
    
    # Track persistence
    if previous_aggregated:
        aggregated["issues"] = track_persistence(
            aggregated["issues"],
            previous_aggregated.get("issues", []),
            plan
        )
    
    # 4. Judge
    print("\nStep 4: Running Judge...")
    manager.set_step("evaluate")
    
    evaluation = await run_judge(
        plan=plan,
        aggregated_critique=aggregated,
        iteration=iteration,
    )
    
    if evaluation is None:
        raise RuntimeError("Judge returned no result")
    
    # Compute plan diff
    plan_diff = None
    if previous_plan:
        plan_diff = compute_plan_diff(previous_plan, plan)
    
    # Build history entry
    history_entry = {
        "iteration": iteration,
        "plan_snapshot": plan,
        "plan_diff": plan_diff,
        "critiques": critiques,
        "aggregated_critique": aggregated,
        "conflicts": evaluation.get("conflicts_resolved", []),
        "evaluation": evaluation
    }
    
    return plan, aggregated, evaluation, history_entry


def generate_output(run_id: str, state: Dict, convergence_result):
    """Generate final output files."""
    from convergence import ConvergenceResult
    
    run_dir = Path(os.environ.get("TMPDIR", "/tmp")) / ".ai-review" / run_id
    plan_path = run_dir / "plan.md"
    report_path = run_dir / "report.json"
    plan = state.get("plan", {})
    history = state.get("history", [])
    
    # Calculate summary stats
    final_evaluation = {}
    if history:
        final_evaluation = history[-1].get("evaluation", {})
    
    total_issues = sum(
        len(h.get("aggregated_critique", {}).get("issues", []))
        for h in history
    )
    conflicts_resolved = sum(
        len(h.get("evaluation", {}).get("conflicts_resolved", []))
        for h in history
    )
    questions_asked = sum(
        len(h.get("plan_snapshot", {}).get("questions", []))
        for h in history
    )
    
    # Generate plan.md
    plan_content = []
    plan_content.append(f"# Plan: {state.get('goal', 'Unknown Goal')}")
    plan_content.append("")
    plan_content.append("Generated by AI Multi-Agent Plan Review Engine")
    plan_content.append(f"Converged: {convergence_result.convergence_type}")
    plan_content.append(f"Iterations: {len(history)}")
    plan_content.append(f"Final Score: {final_evaluation.get('weightedScore', 0.2f):.2f}")
    plan_content.append("")
    
    # Summary
    if plan.get("summary"):
        plan_content.append("## Summary")
        plan_content.append(plan["summary"])
        plan_content.append("")
    
    # Steps
    plan_content.append("## Steps")
    for i, step in enumerate(plan.get("steps", [])):
        plan_content.append(f"### Step {i + 1}: {step.get('description', 'No description')}")
        deps = step.get("dependencies", [])
        if deps:
            plan_content.append(f"**Dependencies:** {', '.join(deps)}")
        deliverables = step.get("deliverables", [])
        if deliverables:
            plan_content.append(f"**Deliverables:** {', '.join(deliverables)}")
        plan_content.append("")
    
    # Accepted Assumptions
    accepted = plan.get("assumptions", {}).get("accepted", [])
    if accepted:
        plan_content.append("## Accepted Assumptions")
        for assumption in accepted:
            plan_content.append(f"- {assumption}")
        plan_content.append("")
    
    with open(plan_path, "w") as f:
        f.write("\n".join(plan_content))
    
    # Generate report.json
    report = {
        "run_id": run_id,
        "goal": state.get("goal"),
        "status": state.get("status"),
        "iterations": len(history),
        "convergence_reason": convergence_result.convergence_type,
        "final_score": final_evaluation.get("weightedScore"),
        "scores": final_evaluation.get("scores"),
        "conflicts_resolved": conflicts_resolved,
        "questions_asked": questions_asked,
        "token_usage": state.get("context", {}).get("token_usage"),
        "plan": plan
    }
    
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\nOutput files:")
    print(f"  - {plan_path}")
    print(f"  - {report_path}")


async def main():
    parser = argparse.ArgumentParser(description="AI Multi-Agent Plan Review Engine")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Init command
    init_parser = subparsers.add_parser("init", help="Initialize a new run")
    init_parser.add_argument("--goal", required=True, help="User goal")
    init_parser.add_argument("--max-iter", type=int, default=5, help="Max iterations")
    init_parser.add_argument("--target-score", type=float, default=00.9, help="Target score")
    init_parser.add_argument(
        "--critics",
        nargs="+",
        default=["implementation", "security", "performance"],
        help="Critic types"
    )
    
    # Run command
    run_parser = subparsers.add_parser("run", help="Run the review loop")
    run_parser.add_argument("--run-id", required=True, help="Run ID")
    run_parser.add_argument("--max-feedback", type=int, default=5, help="Max feedback issues")
    
    # Resume command
    resume_parser = subparsers.add_parser("resume", help="Resume a paused run")
    resume_parser.add_argument("--run-id", required=True, help="Run ID")
    resume_parser.add_argument("--answers", required=True, help="Path to answers JSON")
    
    # Inspect command
    inspect_parser = subparsers.add_parser("inspect", help="Inspect run state")
    inspect_parser.add_argument("--run-id", required=True, help="Run ID")
    
    args = parser.parse_args()
    
    if args.command == "init":
        run_id, state = create_run(
            args.goal,
            max_iterations=args.max_iter,
            target_score=args.target_score,
        )
        print(f"Run ID: {run_id}")
        
        manager = load_run(run_id)
        critic_weights = {ct: 1.0 for ct in args.critics}
        manager.update_state({"context": {"critic_weights": critic_weights}})
        
        converged = False
        while not converged and state["iteration"] < state["max_iterations"]:
            result = await run_iteration(
                manager,
                critic_types=args.critics,
                max_feedback=args.max_feedback,
            )
            
            if result is None:
                print("Paused for user input")
                break
            
            plan, aggregated, evaluation, history_entry = result
            
            manager.add_history_entry(history_entry)
            
            state = manager.read_state()
            convergence_result = check_convergence(
                evaluation=evaluation,
                plan=plan,
                history=state.get("history", []),
                target_score=state["target_score"],
                iteration=state["iteration"],
                max_iterations=state["max_iterations"]
            )
            
            if convergence_result.converged:
                manager.set_status("completed", convergence_result.reason)
                generate_output(run_id, state, convergence_result)
                converged = True
                print(f"\nConverged: {convergence_result.convergence_type}")
                print(f"Reason: {convergence_result.reason}")
    
    elif args.command == "run":
        manager = load_run(args.run_id)
        state = manager.read_state()
        print(json.dumps(state, indent=2))
    
    elif args.command == "resume":
        manager = load_run(args.run_id)
        state = manager.read_state()
        
        if state["status"] != "paused":
            print(f"Run is not paused (status: {state['status']})")
            sys.exit(1)
        
        with open(args.answers) as f:
            answers = json.load(f)
        
        for answer in answers.get("answers", []):
            manager.add_user_answer(answer["question_id"], answer["answer"])
        
        manager.set_status("running")
        manager.set_step("plan_generation")
        
        converged = False
        while not converged and state["iteration"] < state["max_iterations"]:
            result = await run_iteration(manager)
            
            if result is None:
                print("Paused for user input")
                continue
            
            plan, aggregated, evaluation, history_entry = result
            manager.add_history_entry(history_entry)
            
            state = manager.read_state()
            convergence_result = check_convergence(
                evaluation=evaluation,
                plan=plan,
                history=state.get("history", []),
                target_score=state["target_score"],
                iteration=state["iteration"],
                max_iterations=state["max_iterations"]
            )
            
            if convergence_result.converged:
                manager.set_status("completed", convergence_result.reason)
                generate_output(args.run_id, state, convergence_result)
                converged = True
                print(f"\nConverged: {convergence_result.convergence_type}")
                print(f"Reason: {convergence_result.reason}")
    
    elif args.command == "inspect":
        manager = load_run(args.run_id)
        state = manager.read_state()
        print(json.dumps(state, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
