#!/usr/bin/env python3
"""Grade live-render eval runs. Writes grading.json into each run dir."""
import json
import re
from pathlib import Path

ROOT = Path("/home/liangshih.lin/GitHub/flow-marketplace/plugins/live-canvas")
PRES_WS = ROOT / "live-render-to-presentation-workspace" / "iteration-1"
MD_WS = ROOT / "live-render-to-markdown-workspace" / "iteration-1"

ENTITY_TOKENS = re.compile(r"Auth|Billing|Orders|Ledger|Warehouse|User\s*DB", re.I)
ANNOT_TOKENS = re.compile(r"pricing|retention", re.I)


def read_text(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""


def all_files(d: Path, suffix: str | None = None) -> list[Path]:
    if not d.exists():
        return []
    return [
        p for p in d.rglob("*")
        if p.is_file() and (suffix is None or p.suffix == suffix)
    ]


def all_text(d: Path, suffix: str | None = None) -> str:
    return "\n".join(read_text(p) for p in all_files(d, suffix))


def find_project_root(out_dir: Path) -> Path:
    """Find the directory containing package.json. Search outputs/ first, then
    the run's `project/` sibling (some agents wrote scaffolds into the project's
    .claude/ subtree rather than outputs/)."""
    candidates: list[Path] = []
    if out_dir.exists():
        candidates.extend(out_dir.rglob("package.json"))
    # Also check the run's project dir (sibling of outputs)
    run_dir = out_dir.parent
    project_dir = run_dir / "project"
    if project_dir.exists():
        # exclude the fixture's own package.json if any (there is none, fixture is just .claude/)
        candidates.extend(project_dir.rglob("package.json"))
    if not candidates:
        return out_dir
    return min(candidates, key=lambda p: len(p.parts)).parent


def grade_presentation(out_dir_raw: Path, eval_name: str, decisions_required: bool) -> list[dict]:
    out_dir = find_project_root(out_dir_raw)
    pkg_json = out_dir / "package.json"
    pkg_text = read_text(pkg_json) if pkg_json.exists() else ""
    src = out_dir / "src"
    app_tsx = src / "App.tsx"
    app_text = read_text(app_tsx)
    sections_dir = src / "sections"
    section_files = [p for p in all_files(sections_dir, ".tsx") if p.name != "_example.tsx"]
    example_file = sections_dir / "_example.tsx"
    presenter_path = src / "Presenter.tsx"
    decisions = out_dir / "decisions.md"
    all_section_text = "\n".join(read_text(p) for p in all_files(sections_dir, ".tsx"))

    results = []

    def add(text: str, passed: bool, evidence: str):
        results.append({"text": text, "passed": passed, "evidence": evidence})

    add(
        "Output has package.json declaring vite as a dep",
        "vite" in pkg_text and pkg_json.exists(),
        f"package.json {'exists' if pkg_json.exists() else 'MISSING'}; 'vite' {'found' if 'vite' in pkg_text else 'NOT found'}",
    )
    add(
        "Output has src/Presenter.tsx (or App imports a Presenter)",
        presenter_path.exists() or "Presenter" in app_text,
        f"Presenter.tsx exists={presenter_path.exists()}, App refs Presenter={'Presenter' in app_text}",
    )
    add(
        "Output has src/App.tsx with a default export",
        app_tsx.exists() and "export default" in app_text,
        f"App.tsx exists={app_tsx.exists()}, has default export={'export default' in app_text}",
    )
    add(
        f"src/sections/ exists with at least one non-_example .tsx file (found {len(section_files)})",
        len(section_files) >= 1,
        f"{len(section_files)} non-example sections: {[p.name for p in section_files]}",
    )
    # Count distinct section imports from App.tsx
    section_imports = re.findall(r"from\s+['\"]\./sections/([A-Za-z0-9_]+)['\"]", app_text)
    add(
        f"App.tsx imports at least 2 distinct authored sections (found {len(set(section_imports))})",
        len(set(section_imports)) >= 2,
        f"section imports: {section_imports}",
    )
    # _example must be either deleted OR not referenced from App.tsx
    example_ref_in_app = "_example" in app_text or "Example" in re.sub(r"(?m)^\s*//.*$", "", app_text)
    # Better: just check if _example is imported in App
    example_imported = bool(re.search(r"from\s+['\"]\./sections/_example", app_text))
    add(
        "_example.tsx deleted or not imported by App.tsx",
        not example_file.exists() or not example_imported,
        f"_example.tsx exists={example_file.exists()}, imported by App={example_imported}",
    )
    add(
        "At least one section references a real entity from the world fixture",
        bool(ENTITY_TOKENS.search(all_section_text)),
        f"entity match in sections: {bool(ENTITY_TOKENS.search(all_section_text))}",
    )
    add(
        "Unresolved annotation content (pricing OR retention) appears in section files",
        bool(ANNOT_TOKENS.search(all_section_text)),
        f"annotation token match: {bool(ANNOT_TOKENS.search(all_section_text))}",
    )

    if decisions_required:
        # decisions.md is always at outputs/ root (per the harness prompt), not
        # nested inside the auto-detected project root.
        decisions = out_dir_raw / "decisions.md"
        dec_text = read_text(decisions) if decisions.exists() else ""
        bulleted_lines = len([
            line for line in dec_text.splitlines()
            if re.match(r"^\s*([0-9]+[.)]|[-*])\s", line)
        ])
        results.insert(0, {
            "text": "outputs/decisions.md exists",
            "passed": decisions.exists(),
            "evidence": f"path: {decisions}, exists={decisions.exists()}",
        })
        results.insert(1, {
            "text": "decisions.md has at least 4 bulleted/numbered outline entries",
            "passed": bulleted_lines >= 4,
            "evidence": f"counted {bulleted_lines} bulleted/numbered lines",
        })

    return results


def grade_markdown(out_dir: Path, eval_name: str) -> list[dict]:
    md_files = all_files(out_dir, ".md")
    non_md = [p for p in all_files(out_dir) if p.suffix not in ("", ".md")]
    index_candidates = [p for p in md_files if p.name.lower() in ("index.md", "readme.md")]
    index_md = next((p for p in index_candidates if p.name == "index.md"), None) or (
        index_candidates[0] if index_candidates else None
    )
    index_text = read_text(index_md) if index_md else ""

    # per-region: any .md other than index/readme/orphans
    region_files = [
        p for p in md_files
        if p.name.lower() not in ("index.md", "readme.md", "orphans.md")
    ]
    region_with_mermaid = [p for p in region_files if "```mermaid" in read_text(p)]
    all_md_text = all_text(out_dir, ".md")

    # frontmatter check: starts with --- on line 1
    frontmatter_files = [
        p for p in md_files if read_text(p).lstrip().startswith("---\n")
    ]

    # blockquote-annotation check: lines starting with > containing pricing/retention
    annot_quoted = re.search(r"(?m)^\s*>.*(?:pricing|retention)", all_md_text, re.I)

    # platform-specific annotation
    platform_pages = [p for p in region_files if "platform" in p.name.lower()]
    data_pages = [p for p in region_files if "data" in p.name.lower()]
    pricing_on_platform = any(
        re.search(r"(?m)^\s*>.*pricing", read_text(p), re.I) for p in platform_pages
    )
    retention_on_data = any(
        re.search(r"(?m)^\s*>.*retention", read_text(p), re.I) for p in data_pages
    )

    relative_links = re.findall(r"\]\(\./[^\)]+\.md", all_md_text)

    results = []

    def add(text: str, passed: bool, evidence: str):
        results.append({"text": text, "passed": passed, "evidence": evidence})

    add(
        "Output contains index.md (or README.md)",
        index_md is not None,
        f"index found: {index_md}",
    )
    add(
        f"Output contains at least 2 per-region markdown files (found {len(region_files)})",
        len(region_files) >= 2,
        f"region files: {[p.name for p in region_files]}",
    )
    add(
        "index.md contains a ```mermaid fenced block",
        "```mermaid" in index_text,
        f"mermaid in index: {'```mermaid' in index_text}",
    )
    add(
        f"At least one region page contains a mermaid block (found {len(region_with_mermaid)})",
        len(region_with_mermaid) >= 1,
        f"pages with mermaid: {[p.name for p in region_with_mermaid]}",
    )
    add(
        "index.md contains a relative ./*.md link",
        bool(re.search(r"\]\(\./[^\)]+\.md", index_text)),
        f"relative links in index: {len(relative_links)} total in tree",
    )
    add(
        "Annotation (pricing or retention) appears as a blockquote",
        annot_quoted is not None,
        f"matched: {annot_quoted.group(0)[:80] if annot_quoted else 'NONE'}",
    )
    add(
        "Pricing annotation on a platform-named page (as blockquote)",
        pricing_on_platform,
        f"platform pages checked: {[p.name for p in platform_pages]}",
    )
    add(
        "Retention annotation on a data-named page (as blockquote)",
        retention_on_data,
        f"data pages checked: {[p.name for p in data_pages]}",
    )
    add(
        "Footer / provenance line on index (mentions 'generated', 'live-render', or workspace path)",
        bool(re.search(r"(generat|live-render|workspace|exported)", index_text, re.I)),
        f"footer search result: {bool(re.search(r'(generat|live-render|workspace|exported)', index_text, re.I))}",
    )
    add(
        f"No YAML frontmatter on any md file (found {len(frontmatter_files)} with frontmatter)",
        len(frontmatter_files) == 0,
        f"files with frontmatter: {[p.name for p in frontmatter_files]}",
    )

    return results


def main():
    # Presentation
    pres_evals = {
        "eval-casual-make-deck": False,
        "eval-explicit-vite-deck": False,
        "eval-narrative-first": True,
    }
    for eval_name, decisions_required in pres_evals.items():
        for cond in ("with_skill", "without_skill"):
            out_dir = PRES_WS / eval_name / cond / "outputs"
            if not out_dir.exists():
                continue
            results = grade_presentation(out_dir, eval_name, decisions_required)
            passed = sum(1 for r in results if r["passed"])
            total = len(results)
            grading = {
                "eval_name": eval_name,
                "condition": cond,
                "passed": passed,
                "total": total,
                "score": passed / total if total else 0,
                "expectations": results,
            }
            grading_path = PRES_WS / eval_name / cond / "grading.json"
            grading_path.write_text(json.dumps(grading, indent=2))
            print(f"PRES {eval_name}/{cond}: {passed}/{total}")

    # Markdown
    md_evals = ["eval-share-in-slack", "eval-mermaid-per-region", "eval-commit-to-repo"]
    for eval_name in md_evals:
        for cond in ("with_skill", "without_skill"):
            out_dir = MD_WS / eval_name / cond / "outputs"
            if not out_dir.exists():
                continue
            results = grade_markdown(out_dir, eval_name)
            passed = sum(1 for r in results if r["passed"])
            total = len(results)
            grading = {
                "eval_name": eval_name,
                "condition": cond,
                "passed": passed,
                "total": total,
                "score": passed / total if total else 0,
                "expectations": results,
            }
            grading_path = MD_WS / eval_name / cond / "grading.json"
            grading_path.write_text(json.dumps(grading, indent=2))
            print(f"MD   {eval_name}/{cond}: {passed}/{total}")


if __name__ == "__main__":
    main()
