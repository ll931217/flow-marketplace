#!/usr/bin/env python3
"""
State Manager for AI Multi-Agent Plan Review Engine.

Handles atomic state persistence to $TMPDIR/.ai-review/<run_id>/state.json
with PID-aware lock files for safe concurrent operation.
"""

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

STATE_VERSION = 1
DEFAULT_MAX_ITERATIONS = 5
DEFAULT_TARGET_SCORE = 0.90


def get_base_dir() -> Path:
    """Get the base directory for state storage."""
    tmpdir = os.environ.get("TMPDIR", "/tmp")
    base = Path(tmpdir) / ".ai-review"
    base.mkdir(parents=True, exist_ok=True)
    return base


def get_run_dir(run_id: str) -> Path:
    """Get the directory for a specific run."""
    run_dir = get_base_dir() / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir


def get_state_path(run_id: str) -> Path:
    """Get the path to state.json for a run."""
    return get_run_dir(run_id) / "state.json"


def get_lock_path(run_id: str) -> Path:
    """Get the path to the lock file for a run."""
    return get_run_dir(run_id) / "state.lock"


def generate_run_id() -> str:
    """Generate a unique run ID."""
    return f"run_{uuid.uuid4().hex[:8]}"


class LockManager:
    """PID-aware lock file manager with dead process override."""

    def __init__(self, run_id: str):
        self.run_id = run_id
        self.lock_path = get_lock_path(run_id)
        self.lock_fd = None

    def _is_pid_alive(self, pid: int) -> bool:
        """Check if a PID is still alive."""
        try:
            os.kill(pid, 0)
            return True
        except (OSError, ProcessLookupError):
            return False

    def acquire(self) -> bool:
        """Acquire the lock. Returns True if successful."""
        if self.lock_path.exists():
            try:
                lock_data = json.loads(self.lock_path.read_text())
                pid = lock_data.get("pid")
                if pid and self._is_pid_alive(pid):
                    return False
                print(f"Warning: Stale lock detected (pid {pid}, dead). Overriding.")
                self.lock_path.unlink()
            except (json.JSONDecodeError, KeyError):
                self.lock_path.unlink(missing_ok=True)

        self.lock_fd = open(self.lock_path, "w")
        lock_data = {
            "pid": os.getpid(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        json.dump(lock_data, self.lock_fd)
        self.lock_fd.flush()
        return True

    def release(self):
        """Release the lock."""
        if self.lock_fd:
            self.lock_fd.close()
            self.lock_fd = None
        self.lock_path.unlink(missing_ok=True)


class StateManager:
    """Manages atomic state persistence with validation."""

    def __init__(self, run_id: str):
        self.run_id = run_id
        self.state_path = get_state_path(run_id)
        self.lock = LockManager(run_id)

    def init_state(
        self, goal: str, constraints: Optional[list] = None, **kwargs
    ) -> dict:
        """Initialize a new state for a run."""
        now = datetime.now(timezone.utc).isoformat()

        state = {
            "version": STATE_VERSION,
            "run_id": self.run_id,
            "status": "running",
            "current_step": "plan_generation",
            "goal": goal,
            "constraints": constraints or [],
            "plan": None,
            "iteration": 0,
            "max_iterations": kwargs.get("max_iterations", DEFAULT_MAX_ITERATIONS),
            "target_score": kwargs.get("target_score", DEFAULT_TARGET_SCORE),
            "pending_questions": [],
            "user_answers": [],
            "history": [],
            "context": {
                "last_updated": now,
                "created_at": now,
                "prompt_version": "v1",
                "agent_versions": {"planner": "v1", "critic": "v1", "judge": "v1"},
                "token_usage": {"total": 0, "by_agent": {}},
                "critic_weights": {
                    "security": 1.5,
                    "implementation": 1.0,
                    "performance": 1.0,
                },
                "convergence_reason": None,
            },
            "failure_reason": None,
        }

        self._write_state(state)
        return state

    def read_state(self) -> Optional[dict]:
        """Read the current state."""
        if not self.state_path.exists():
            return None
        return json.loads(self.state_path.read_text())

    def _write_state(self, state: dict):
        """Write state atomically with lock."""
        if not self.lock.acquire():
            raise RuntimeError(f"Could not acquire lock for run {self.run_id}")

        try:
            state["context"]["last_updated"] = datetime.now(timezone.utc).isoformat()
            tmp_path = self.state_path.with_suffix(".tmp")
            tmp_path.write_text(json.dumps(state, indent=2))
            tmp_path.rename(self.state_path)
        finally:
            self.lock.release()

    def update_state(self, updates: dict) -> dict:
        """Update state with partial updates."""
        state = self.read_state()
        if not state:
            raise ValueError(f"No state found for run {self.run_id}")

        def deep_merge(base: dict, update: dict) -> dict:
            for key, value in update.items():
                if (
                    key in base
                    and isinstance(base[key], dict)
                    and isinstance(value, dict)
                ):
                    deep_merge(base[key], value)
                else:
                    base[key] = value
            return base

        deep_merge(state, updates)
        self._write_state(state)
        return state

    def set_step(self, step: str) -> dict:
        """Set the current step."""
        valid_steps = [
            "plan_generation",
            "awaiting_user",
            "critique",
            "refine",
            "evaluate",
        ]
        if step not in valid_steps:
            raise ValueError(f"Invalid step: {step}. Valid: {valid_steps}")
        return self.update_state({"current_step": step})

    def set_status(self, status: str, reason: Optional[str] = None) -> dict:
        """Set the status."""
        valid_statuses = ["running", "paused", "completed", "failed"]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status: {status}. Valid: {valid_statuses}")

        updates = {"status": status}
        if status == "failed" and reason:
            updates["failure_reason"] = reason
        if status == "completed" and reason:
            updates["convergence_reason"] = reason

        return self.update_state(updates)

    def add_history_entry(self, entry: dict) -> dict:
        """Add an entry to history (append-only)."""
        state = self.read_state()
        if not state:
            raise ValueError(f"No state found for run {self.run_id}")

        expected_iteration = len(state["history"])
        if entry.get("iteration") != expected_iteration:
            raise ValueError(
                f"History must be append-only. Expected iteration {expected_iteration}"
            )

        state["history"].append(entry)
        state["iteration"] = expected_iteration + 1
        self._write_state(state)
        return state

    def add_user_answer(self, question_id: str, answer: str) -> dict:
        """Add a user answer to a question."""
        state = self.read_state()
        if not state:
            raise ValueError(f"No state found for run {self.run_id}")

        state["user_answers"].append({"question_id": question_id, "answer": answer})
        self._write_state(state)
        return state


def create_run(goal: str, **kwargs) -> tuple[str, dict]:
    """Create a new run and return (run_id, initial_state)."""
    run_id = generate_run_id()
    manager = StateManager(run_id)
    state = manager.init_state(goal, **kwargs)
    return run_id, state


def load_run(run_id: str) -> StateManager:
    """Load an existing run."""
    manager = StateManager(run_id)
    if not manager.state_path.exists():
        raise FileNotFoundError(f"No run found with ID: {run_id}")
    return manager


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="State management for AI review")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="Initialize a new run")
    init_parser.add_argument("--goal", required=True, help="The goal for the run")
    init_parser.add_argument("--max-iter", type=int, default=5, help="Max iterations")
    init_parser.add_argument(
        "--target-score", type=float, default=0.9, help="Target score"
    )

    read_parser = subparsers.add_parser("read", help="Read current state")
    read_parser.add_argument("--run-id", required=True, help="Run ID to read")

    args = parser.parse_args()

    if args.command == "init":
        run_id, state = create_run(
            args.goal, max_iterations=args.max_iter, target_score=args.target_score
        )
        print(f"Run ID: {run_id}")
        print(json.dumps(state, indent=2))
    elif args.command == "read":
        manager = load_run(args.run_id)
        state = manager.read_state()
        print(json.dumps(state, indent=2))
