#!/usr/bin/env python3
"""Aggregate per-eval grading + timing into a markdown report per skill."""
import json
from pathlib import Path

ROOT = Path("/home/liangshih.lin/GitHub/flow-marketplace/plugins/live-canvas")


def load(p: Path) -> dict:
    return json.loads(p.read_text())


def summarize(skill_workspace: Path, eval_names: list[str], skill_label: str) -> str:
    iteration = skill_workspace / "iteration-1"
    lines: list[str] = [
        f"# {skill_label} — Iteration 1 Benchmark",
        "",
        "Headless eval. 3 prompts × {with_skill, without_skill (no skill loaded)}.",
        "Fixture: synthesized world.json with 2 regions, 6 nodes, 4 edges, 2 unresolved annotations.",
        "",
        "## Summary",
        "",
        "| Eval | with_skill | without_skill | Δ pass | Δ tokens | Δ duration |",
        "|---|---|---|---|---|---|",
    ]

    totals = {"with_skill": [0, 0, 0, 0], "without_skill": [0, 0, 0, 0]}  # passed, total, tokens, dur_ms

    for name in eval_names:
        row_vals = {}
        for cond in ("with_skill", "without_skill"):
            run_dir = iteration / name / cond
            g = load(run_dir / "grading.json")
            t = load(run_dir / "timing.json")
            row_vals[cond] = (g["passed"], g["total"], t["total_tokens"], t["duration_ms"])
            totals[cond][0] += g["passed"]
            totals[cond][1] += g["total"]
            totals[cond][2] += t["total_tokens"]
            totals[cond][3] += t["duration_ms"]

        ws, wo = row_vals["with_skill"], row_vals["without_skill"]
        d_pass = ws[0] - wo[0]
        d_tokens = ws[2] - wo[2]
        d_dur_s = (ws[3] - wo[3]) / 1000
        lines.append(
            f"| {name} | {ws[0]}/{ws[1]} ({ws[2]} tok, {ws[3]/1000:.0f}s) | "
            f"{wo[0]}/{wo[1]} ({wo[2]} tok, {wo[3]/1000:.0f}s) | "
            f"{'+' if d_pass>=0 else ''}{d_pass} | {'+' if d_tokens>=0 else ''}{d_tokens} | "
            f"{'+' if d_dur_s>=0 else ''}{d_dur_s:.0f}s |"
        )

    # Totals row
    ws_t, wo_t = totals["with_skill"], totals["without_skill"]
    lines.append(
        f"| **Totals** | **{ws_t[0]}/{ws_t[1]} ({ws_t[0]/ws_t[1]*100:.0f}%)** | "
        f"**{wo_t[0]}/{wo_t[1]} ({wo_t[0]/wo_t[1]*100:.0f}%)** | "
        f"+{ws_t[0]-wo_t[0]} | +{ws_t[2]-wo_t[2]} | +{(ws_t[3]-wo_t[3])/1000:.0f}s |"
    )

    lines.extend(["", "## Per-eval assertion breakdown", ""])

    for name in eval_names:
        lines.append(f"### {name}")
        lines.append("")
        ws_grading = load(iteration / name / "with_skill" / "grading.json")
        wo_grading = load(iteration / name / "without_skill" / "grading.json")

        lines.append("| # | Assertion | with_skill | without_skill |")
        lines.append("|---|---|---|---|")
        for i, ws_a in enumerate(ws_grading["expectations"]):
            wo_a = wo_grading["expectations"][i] if i < len(wo_grading["expectations"]) else None
            ws_mark = "✅" if ws_a["passed"] else "❌"
            wo_mark = ("✅" if wo_a and wo_a["passed"] else "❌") if wo_a else "—"
            text = ws_a["text"].replace("|", "\\|")
            lines.append(f"| {i+1} | {text} | {ws_mark} | {wo_mark} |")
        lines.append("")

        # Quick links
        ws_out = iteration / name / "with_skill" / "outputs"
        wo_out = iteration / name / "without_skill" / "outputs"
        lines.append(f"**Outputs:** `{ws_out.relative_to(ROOT)}` (with_skill) vs `{wo_out.relative_to(ROOT)}` (baseline)")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## How to inspect outputs qualitatively")
    lines.append("")
    lines.append("Each eval has two `outputs/` directories side-by-side. Compare:")
    lines.append("")
    lines.append("- **File shape** — does the with_skill output match the skill's intended layout?")
    lines.append("- **Narrative quality** (presentation only) — do sections read well, or are they padded?")
    lines.append("- **Mermaid syntax** (markdown only) — do diagrams parse cleanly?")
    lines.append("- **Annotation handling** — is the human's annotation text quoted verbatim?")
    return "\n".join(lines)


pres_evals = ["eval-casual-make-deck", "eval-explicit-vite-deck", "eval-narrative-first"]
md_evals = ["eval-share-in-slack", "eval-mermaid-per-region", "eval-commit-to-repo"]

pres_ws = ROOT / "live-render-to-presentation-workspace"
md_ws = ROOT / "live-render-to-markdown-workspace"

(pres_ws / "iteration-1" / "REPORT.md").write_text(
    summarize(pres_ws, pres_evals, "live-render-to-presentation")
)
(md_ws / "iteration-1" / "REPORT.md").write_text(
    summarize(md_ws, md_evals, "live-render-to-markdown")
)
print("Reports written:")
print(f"  {pres_ws / 'iteration-1' / 'REPORT.md'}")
print(f"  {md_ws / 'iteration-1' / 'REPORT.md'}")
