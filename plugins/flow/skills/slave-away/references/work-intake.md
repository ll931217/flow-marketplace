# Work intake — one queue, many sources

The loop must not be limited to what a human filed in beads. Most of the useful work in
a long unattended run is work the agent *found*: a bug next door, a missing test, a
follow-up its own change created.

But two queues means two terminal conditions, and two terminal conditions means the run
either stops early or never stops. So: **many sources in, one queue out.** Everything
becomes a bead.

## Sources

### 1. `bd ready` — the spine

```bash
bd ready --json
```

Open issues with no unresolved blockers. This is the queue proper. Beads already handles
dependency ordering; you only break ties.

Tie-break order:
1. Priority ascending (P0 → P4)
2. **Unblock count descending** — a bead that unblocks three others is worth more than
   an isolated one of the same priority. `bd show <id>` lists what depends on it.
3. Oldest first

### 2. `in_progress` orphans — always first

```bash
bd list --status=in_progress --json
```

A bead sitting in `in_progress` at the start of a tick means a previous run died
mid-flight. Handle these **before** anything in `ready`:

- Check the worktree for partial work (`git status`, `git diff`)
- Check the journal for what the previous attempt was doing
- Either finish it, or reset it: `git restore`/`git stash` the partial work and
  `bd update <id> --status=open` so it re-enters through the normal gate

Leaving orphans is how a queue silently stops draining: they never appear in `bd ready`,
so the loop thinks it's done while real work sits unfinished.

### 3. Work the agent invents — the important one

Anything discovered mid-implementation becomes a bead **immediately**, not at the end of
the bead, not in a note to the user:

```bash
bd create --title="<specific and actionable>" \
  --description="<what, why, and everything you already learned about it>" \
  --acceptance="<how a stranger verifies it>" \
  --notes="<file:line pointers you found while working>" \
  --type=bug|task|chore --priority=<0-4> \
  --deps discovered-from:<current-bead-id> --json

bash "$SA" log --type=discovered --bead=<new-id> --msg="<title>"
```

**File it at the moment of discovery.** The context is in your head right then and
nowhere else; five beads later it's gone, and after a compaction it never existed.

**Write it to the Step 2 standard.** You are the only person who will ever have this
context — bake it in now and the bead needs no enrichment when it comes up.

**File everything; work only what's in scope.** A bead outside the run's scope is filed
at the right priority and excluded by the scope filter. Filing is free. An unattended
loop that follows every interesting thread it finds is how a 4-hour run becomes a
40-hour one with a 900-file diff.

Priority guide for discovered work:

| Found | Priority |
|---|---|
| A bug your change exposed in the path you're touching | 0–1, fix it in this bead |
| A latent bug elsewhere, data-loss or security shaped | 0–1, file it, work it if in scope |
| Missing test coverage on the code you just wrote | fix it in this bead — that's TDD, not new work |
| Missing coverage elsewhere | 2–3, file it |
| A refactor your change makes obvious | 3, file it, do **not** do it inline |
| A dependency bump, a lint rule, a doc gap | 3–4, file it |

The refactor line is the one that matters. Surgical changes are reviewable; a bead that
grows a refactor is not. File it and let it compete on merit next tick.

### 4. Adopted external sources — only when asked

These are off by default because silently hoovering a repo's TODOs into a work queue is
a surprise, not a feature.

**Native task tools.** If the session has a `TaskList` populated by another skill, mirror
open items into beads with `--deps discovered-from:` pointing at whatever produced them,
then work the beads. Never run two live task systems in parallel.

**Flow task lists.** `flow:generate-tasks` already writes to beads, so a PRD's tasks are
in the queue automatically. If a `.flow/` markdown task list exists without corresponding
beads, that's a stale artifact — say so rather than adopting it silently.

**Code TODOs.** Only markers that are explicitly addressed to the tracker
(`TODO(bd):`, `FIXME(bd):`) get adopted. A bare `// TODO` is a note to a human, not a
work item, and adopting them wholesale floods the queue with decade-old noise.

**A free-text ask in the invocation.** `/flow:slave-away "also sort out the flaky tests"`
becomes a bead first, then gets worked. Same standard as everything else — if the
instruction goes straight into the work loop without becoming a bead, it vanishes on
compaction.

## Normalization rules

1. **Every unit of work is a bead before it is worked.** No exceptions — the terminal
   condition depends on it.
2. **Every discovered bead links to its parent** via `discovered-from`. That's what makes
   the "discovered work" section of the report a tree instead of a list.
3. **Deduplicate before creating.** `bd search "<keywords>"` first. A loop that re-files
   the same bead every tick will never terminate — it manufactures its own work.
4. **Never create a bead the loop then immediately closes as a no-op.** If it took less
   time than writing the bead, it wasn't work.

## Scope filter

Set at init, applied to every queue read:

```bash
/flow:slave-away --priority=0,1      # only critical and high
/flow:slave-away --label=backend     # only beads carrying this label
/flow:slave-away --only=bd-42,bd-51  # exactly these, plus their discovered children
```

Scope narrows what gets *worked*. It never narrows what gets *filed* — out-of-scope
discoveries are still recorded, and the final report lists them so the human sees what
the run deliberately left alone.
