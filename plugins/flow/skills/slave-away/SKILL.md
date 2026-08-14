---
name: slave-away
description: Unattended backlog grinder. Drains the open beads (bd) queue end-to-end — picks the next ready issue, enriches it until it is self-sufficient, implements it TDD-first, runs the repo's quality gates, commits, closes it, and repeats until nothing is left to work. Also adopts work the agent itself invented mid-run (discovered bugs, follow-ups, native TaskCreate tasks) into the same queue, so the loop is never limited to what a human filed. Runs in its own git worktree, commits per issue, and NEVER pushes, deploys, or touches production — every blocked destructive action is recorded and presented at the end for the human to run. Use this skill whenever the user wants to work through a backlog without babysitting it — "work through the open beads", "clear the backlog", "keep implementing until the queue is empty", "implement all ready issues", "grind through bd ready", "run unattended until everything is closed", "slave away at these tasks", or when they pair it with /loop to keep going across sessions. Prefer this over flow:implement when there is no PRD and the work is just a pile of open issues, and over flow:autonomous when the issues already exist and no planning is needed.
---

# Slave Away

Point this at a beads queue and it works until the queue is empty, then stops itself
and hands the human a report.

The design principle: **the human reviews outcomes, not steps.** Everything below exists
to remove a reason the loop would otherwise stop and ask a question.

---

# The runbook

Execute these in order. The explanatory sections come after — read them when a step
needs judgment, not before you start.

## Step 0 — Start the run

```bash
export SA="${FLOW_PLUGIN_ROOT}/skills/slave-away/scripts/slave-away.sh"

bash "$SA" preflight            # bd reachable? safe branch? clean tree?
```

**If `preflight` says beads is unreachable, stop and run `bd bootstrap`.** `bd` fails
hard when its Dolt database is missing (fresh clone, branch switch). An empty queue read
from a broken database looks exactly like a finished run — that false green is the worst
outcome this skill can produce.

Isolate, so a multi-hour unattended grind never mutates the checkout the human is using:

```bash
wt create slave-away/$(date -u +%Y%m%d-%H%M%S)          # preferred
# if wt is unavailable or errors:
git worktree add ../$(basename $PWD)-slave-away -b slave-away/<stamp>
cd <the new worktree>
```

If both fail, create a branch (`git switch -c slave-away/<stamp>`) and record
`--isolation=in-place`. **Do not skip isolation silently** — the report has to tell the
human where the work is.

```bash
bash "$SA" init --isolation=worktree --worktree="$PWD"
bash "$SA" gates set --test="<the project's real test command>"
```

**Why the script is not optional bookkeeping.** The final report is *rendered from*
`journal.jsonl` and `deferred.jsonl`. Anything you keep only in your head — a bead you
closed, a command you refused to run, a question you flagged — does not reach the human.
`tick` computes the terminal condition from `bd` and fails loud if `bd` errors; deciding
"looks done to me" instead is how a run ends early and reports success. If `init` never
ran, every later `$SA` call fails, which is your signal that you skipped it.

## Step 1 — Pick the next bead

```bash
bash "$SA" queue        # {ready, in_progress, open_not_ready, counts, terminal}
```

**Resume `in_progress` first.** A bead left `in_progress` means a previous run died
mid-flight; it will never appear in `ready`, so ignoring it means the queue never drains.
Check `git status` for partial work — finish it, or reset it and set the bead back to
`open`.

Otherwise take the head of `ready`: lowest priority number first, then whichever bead
unblocks the most others, then oldest.

If `terminal` is `true`, go to Step 6.

## Step 2 — Make the bead self-sufficient, *then* claim it

This is one step, in this order, and the order is the point. A bead you can't understand
is the number-one reason a loop stops to ask a human — so repair the bead instead.

```bash
bd show <id>
```

Does it have (a) what & why, (b) acceptance criteria, (c) a pointer into the code?
If any is missing, find it — `Explore` subagents for the code, `bd show` on the parent,
`bd memories <keyword>` for past decisions, `git log -p` on the touched area — and
**write it back before you claim**:

```bash
bd update <id> \
  --description="<what and why, written for a stranger>" \
  --acceptance="<observable conditions that make this done>" \
  --notes="<file:line pointers you found>"

bd show <id>            # confirm it stuck — this is the proof the gate passed
bd update <id> --claim
bash "$SA" log --type=start --bead=<id>
```

Write-back is not paperwork. After a compaction or a `/loop` re-entry, the only context
that survives is what is on disk. A bead enriched *in your head* has to be re-enriched
next tick, and the human reading the bead later has no idea what you knew.

**If the missing piece is a decision, not a fact** — conflicting requirements, an unstated
business rule, a choice with no technically correct answer — do not guess and do not wait:

```bash
bd update <id> --notes="Blocked on: <the question, answerable in one sentence>. Investigated: <what you found>. Options: <A vs B and the trade-off>."
bd human <id>
bd update <id> --status=blocked
bash "$SA" log --type=blocked --bead=<id> --msg="<the question in one line>"
```

Then go back to Step 1. One undecidable bead must never wedge the queue.

Rubric and enrichment recipes: [references/context-sufficiency.md](references/context-sufficiency.md).

## Step 3 — Implement

Normal discipline; this skill does not reinvent it:

1. **TDD.** Failing test first, confirm RED, implement to GREEN.
   See [../shared/references/tdd-principles.md](../shared/references/tdd-principles.md).
2. **Delegate by type** to the specialized subagent the bead implies.
   See [../implement/references/subagent-delegation.md](../implement/references/subagent-delegation.md).
3. **Run the gates recorded in Step 0** — the project's real commands, not a guess.

If a destructive or outward-facing action is required, do **not** stop — build up to the
boundary and defer it. See [Safety](#safety--the-deny-list) below.

On failure:

```bash
bash "$SA" log --type=failed --bead=<id> --msg="<the one decisive error line>"
bash "$SA" attempts <id>
```

Under 3 attempts: **change approach** — a second identical attempt is a wasted iteration.
At 3: block it (`bd human`, `--status=blocked`), log it, and return to Step 1.

## Step 4 — The pre-close checklist

Before every `bd close`, answer these three in writing. This is where discovered work
gets captured; without a forced answer it evaporates into the diff.

1. **What did I touch but not fix?**
2. **What did I read that looked wrong?** (swallowed exceptions, missing validation,
   a test that asserts nothing, a stale comment)
3. **What does this change now make obviously necessary?**

Write "none" if the honest answer is none — but write something for each. For every
non-"none" answer, file a bead **now**, with the context baked in, because you are the
only one who will ever have it:

```bash
bd create --title="<specific and actionable>" \
  --description="<what, why, and everything you already learned>" \
  --acceptance="<how a stranger verifies it>" \
  --notes="<file:line you found it at>" \
  --type=bug|task|chore --priority=<0-4> \
  --deps discovered-from:<current-bead-id> --json

bash "$SA" log --type=discovered --bead=<new-id> --msg="<title>"
```

**File everything; work only what's in scope.** A refactor your change makes obvious gets
filed at P3, not performed inline — a bead that grows a refactor stops being reviewable.
Search first (`bd search`) so the loop doesn't manufacture duplicates of its own work.

## Step 5 — Close and commit

Only when the gates are green. A bead closed on failing tests is worse than an open one,
because nothing will look at it again.

```bash
git add <the files this bead touched>          # enumerate them; never `git add -A`
git commit -m "<type>(<scope>): <what> (<bead-id>)"
bd close <id> --reason="<what shipped and how it was verified>" --suggest-next
bash "$SA" log --type=closed --bead=<id> --commit=$(git rev-parse HEAD) \
     --msg="<one line>" --discovered=<new-bead-ids|none>
```

`--discovered=` is required and the script refuses the close without it — it is the
Step 4 checklist, enforced. Pass the ids you filed, or `none` if every honest answer was
nothing. It is not there to be padded; it is there so the question is impossible to skip.

One commit per bead. That is a reviewable unit per issue instead of one end-of-run blob,
and a crash costs at most one bead. Enumerate the files: a whole-tree `add -A` in an
unattended loop sweeps in stray artifacts and credentials, and git's object graph has no
undo.

**Never `git push` and never `bd dolt push`.**

## Step 6 — Tick, or finish

```bash
bash "$SA" tick         # {iteration, terminal, stop, stop_reason, queue counts}
```

- `stop` false → back to Step 1.
- `stop` true → Step 7. `stop_reason` says which: `queue-drained` or a tripped breaker.

Breakers exist so an unattended run can lose honestly instead of spinning: per-bead
attempts (3), consecutive failures (3), iterations (50), wall clock (4h), no-progress
ticks (2). Every one of them ends the run **with a report**.

Never make the queue shrink dishonestly — do not close a bead whose tests fail, delete a
bead you can't do, lower a gate, or silence an error to keep going.

## Step 7 — Report

```bash
bash "$SA" report
```

Verify the rendered skeleton against reality before presenting it — `git log`, `git
status`, `bd list --all`. The journal records what the loop *believed*; where they
disagree, reality wins and the discrepancy goes in the report.

Order matters: **deferred actions first**, then closed beads, blocked beads, discovered
work, gate results, and the exact commands to review and land the branch. Everything
else is already done; the deferred actions are the only part still needing a human.

Template and writing rules: [references/final-report.md](references/final-report.md).

Then stop the outer loop: `ScheduleWakeup({stop: true})` if self-paced, or tell the user
to `/loop stop` if they started it on a fixed interval.

---

# Safety — the deny list

The loop runs unattended, so anything irreversible or outward-facing is off the table.
It is not asked for permission at 3am; it is **deferred and reported**.

**Never, in any run:**

- `git push` in any form, force-push, tag push, deleting a branch outside its own worktree
- `bd dolt push` or any beads remote sync
- Creating or merging MRs/PRs; posting to Jira, GitLab, Slack, Mattermost, any webhook
- Any write to a database that is not a disposable local instance — `DELETE`, `DROP`,
  `TRUNCATE`, `ALTER`, `UPDATE`, `INSERT`; running a migration against it
- Deploys and infra apply: `kubectl apply`, `terraform apply`, Komodo deploy/build,
  Airflow triggers, docker actions against a shared registry or host
- Secret writes: `gopass insert|rm`, rotating credentials, editing `.env` on a shared host
- Anything outside the run's worktree: `rm -rf`, edits, in-place changes to a shared env
  or global lockfile
- Rewriting history that already exists on a remote

Treat a database as production unless you can prove otherwise. Local means `localhost`,
`127.0.0.1`, or a container this run started.

**When a bead needs one of these, keep going.** Build everything up to the boundary —
write the migration and apply it locally; write the manifest and `--dry-run` it; write
the test and skip it with a reason — then:

```bash
bash "$SA" defer --bead=<id> \
  --command='<exact command a human should run, no placeholders>' \
  --why='<what in the bead required it>' \
  --effect='<what it changes; what is irreversible>' \
  --verify='<how to confirm it worked>'
```

Close the bead only if the implementable part is complete and verified; otherwise leave
it open with the deferred action noted on it.

Full list, detection heuristics, and the "build up to the boundary" table:
[references/safety-policy.md](references/safety-policy.md).

---

# How this differs from its siblings

| Skill | Starts from | Stops when |
|---|---|---|
| `flow:autonomous` | a feature idea | that one feature is implemented |
| `flow:implement` | an approved PRD's task list | that PRD's tasks are done |
| **`flow:slave-away`** | **whatever is already open in `bd`** | **the queue is drained** |

Slave-away has no PRD and no fixed scope. Its scope is "the queue", and the queue grows
during the run as work is discovered. That is intentional.

## Invocation

```bash
/flow:slave-away                      # grind until done
/loop 15m /flow:slave-away            # survive compaction and session death
/loop /flow:slave-away                # self-paced

/flow:slave-away --priority=0,1       # scope filters
/flow:slave-away --label=frontend
/flow:slave-away --only=bd-42,bd-51
```

`/loop` is the **outer heartbeat, not the work rhythm.** The inner loop (Steps 1–6) moves
bead to bead with no waiting. `/loop` exists so a compaction or a dead session doesn't end
the run — the next tick reads `.flow/slave-away/<run-id>/` off disk and resumes. Getting
this backwards produces a loop that does one bead every 15 minutes.

Scope narrows what gets *worked*, never what gets *filed*.

## Resume

On every entry, before anything else:

```bash
cat .flow/slave-away/current                       # run in flight?
bash "$SA" status                                  # worktree, gates, breakers
tail -20 .flow/slave-away/<run-id>/journal.jsonl   # what was happening
cd "$(bash "$SA" status | jq -r '.worktree')"
git status                                         # partial work from a dead attempt?
```

A run already in flight is resumed, never re-initialized — a second run directory splits
the journal and breaks the report.

Loop wiring, breaker tuning, and failure handling:
[references/loop-control.md](references/loop-control.md).
Intake from non-beads sources: [references/work-intake.md](references/work-intake.md).

## Prerequisites

- `bd` (beads) with a reachable database (`bd doctor`)
- `git`; `wt` (worktrunk) preferred for isolation
- `jq` for the helper script
- A test command in the project — without gates, "green before close" is unenforceable,
  and the report must say so up front rather than imply verification happened

## See also

- [../implement/SKILL.md](../implement/SKILL.md) — the per-task discipline this reuses
- [../autonomous/SKILL.md](../autonomous/SKILL.md) — PRD-driven sibling
- [../cleanup/SKILL.md](../cleanup/SKILL.md) — landing the work after review
