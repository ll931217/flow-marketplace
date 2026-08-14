# Loop control — running long, stopping right

Two loops are in play, and conflating them is the main way this goes wrong.

**The inner loop** is bead-to-bead inside one turn. It has no delay: finish a bead,
take the next one, keep going. Nothing is gained by waiting.

**The outer loop** is `/loop`. It exists because a session is not durable — it compacts,
it crashes, the user closes the terminal. `/loop` re-enters the skill, which reads
`.flow/slave-away/<run-id>/` off disk and picks up mid-run. It is a **resilience
heartbeat**, not the work rhythm.

Getting this backwards produces a loop that does one bead every 15 minutes.

## Wiring the outer loop

### Fixed interval (what the user usually wants)

```bash
/loop 15m /flow:slave-away
```

Every 15 minutes, re-enter. If the inner loop is still healthy and mid-bead, the tick is
a no-op check. If the session died, the tick resurrects the run.

### Self-paced

```bash
/loop /flow:slave-away
```

The model picks the delay via `ScheduleWakeup`. Use a long delay (1200s+) — the inner
loop is the primary mechanism and the wakeup is only a fallback for a hung or dead run.
Short polling intervals here waste tokens for nothing.

### Ending it

When the terminal condition is met, the skill stops its own loop rather than waiting for
the user:

- Self-paced: `ScheduleWakeup({stop: true})`
- Fixed interval: tell the user plainly that the run is complete and to `/loop stop`;
  a cron-mode loop cannot cancel itself from inside the turn.

Either way, **print the final report on the terminal tick**, not on some later one.

## Terminal condition

```
done  ⟺  bd ready is empty  AND  bd list --status=in_progress is empty
```

That's it. `bash "$SA" tick` computes it; don't eyeball it.

Beads still `open` when this trips are blocked — on a dependency that's itself blocked,
on a human decision, or on a deferred action. **That is a legitimate finish.** Report
them by name with what each is waiting on. Do not spin waiting for them to unblock
themselves; nothing in the loop can unblock a bead flagged `bd human`.

Two ways to get this wrong:

- **False green:** `bd` errored and the empty output was read as an empty queue. The
  helper script fails loud on any `bd` non-zero exit precisely to prevent this. Never
  add `2>/dev/null` to a queue read.
- **False busy:** an orphaned `in_progress` bead from a dead run keeps `terminal` false
  forever. Step 1 resolves orphans first for this reason.

## Circuit breakers

An unattended loop needs a way to lose. Every breaker ends the run **with a report** —
never silently, never by just stopping.

| Breaker | Default | What it catches |
|---|---|---|
| `max_attempts` | 3 per bead | A bead that can't be done. Block it (`bd human`) and take the next one — this is per-bead, it does not end the run |
| `max_consecutive_failures` | 3 | Three different beads failing in a row means the environment is broken (deps, DB, network), not the beads. Stop; grinding won't help |
| `max_iterations` | 50 | Backstop against a create/close cycle that manufactures its own work |
| `max_wall_clock_seconds` | 14400 (4h) | Bounds an unattended burn |
| `max_no_progress_ticks` | 2 | Queue non-empty but nothing closed across two ticks = wedged |

Override in `run.json` before starting, or per invocation:

```bash
/flow:slave-away --max-iterations=200 --max-wall-clock=8h
```

The per-bead breaker is the one that keeps the loop alive; the rest are the ones that
let it die honestly. Both matter.

### Handling a bead failure

```bash
bash "$SA" log --type=failed --bead=<id> --msg="<what failed, one line>"
n=$(bash "$SA" attempts <id>)
```

- `n < max_attempts` → **change approach**, don't retry the same thing. A second
  identical attempt is a wasted iteration. Re-read the error, re-read the code, try a
  different angle.
- `n >= max_attempts` → block it and move on:

```bash
bd update <id> --status=blocked \
  --notes="Failed <n> attempts. Tried: <approaches>. Failure: <the decisive error line>."
bd human <id>
bash "$SA" log --type=blocked --bead=<id> --msg="<n> attempts exhausted"
```

Record the *decisive* error line, not the whole log. The next reader — human or a future
loop — needs the one line that says why, not 400 lines of stack trace.

## Journal vocabulary

`log --type=` accepts anything, but these six route into their own section of the final
report. Use them for anything you want the human to see under a heading:

| type | Renders as | Also used by |
|---|---|---|
| `start` | — (trace only) | |
| `closed` | Closed beads | `report` |
| `blocked` | Blocked / needs a human | `report` |
| `discovered` | Discovered work filed this run | `report` |
| `deferred` | ⚠ Deferred actions | written for you by `defer` |
| `failed` | — (trace only) | `attempts`, the consecutive-failure breaker |

Anything else lands in an "Other journal entries" catch-all, so a non-standard type is
degraded but never silently dropped. `failed` is the one that must be exact — `attempts`
and the breaker count it by name, so logging a failure as `error` or `retry` makes the
per-bead attempt limit invisible and the loop will retry forever.

## Resume after compaction

All run state is on disk. The conversation is a computation, the files are the memory.

On every entry — first or hundredth — do this before anything else:

```bash
cat .flow/slave-away/current                       # is a run in flight?
bash "$SA" status                                  # run.json: worktree, gates, breakers
tail -20 .flow/slave-away/<run-id>/journal.jsonl   # what was happening
cd "$(bash "$SA" status | jq -r '.worktree')"      # get back into the worktree
git status                                         # partial work from a dead attempt?
```

Then:

- Partial uncommitted work matching an `in_progress` bead → finish it or reset it.
- No run in flight → `init` a fresh one.
- Run in flight → **never re-init.** `init` is a no-op when `current` exists, but don't
  rely on that; a second run directory splits the journal and breaks the report.

The journal is append-only and each entry is a complete JSON object per line, so a
truncated write costs one entry, not the file. Read it with `jq -s` or line-by-line;
never assume the last line is complete.

## What the loop must never do to keep itself alive

- Close a bead whose tests don't pass, to make the queue shrink
- Delete or re-scope a bead it can't do, instead of blocking it
- Lower a quality gate, skip a test, or add an exclusion to make a gate green
- Ask the user something and wait — flag it, move on, ask in the report
- Silence an error to keep going. If a gate can't run, that is a finding, and the report
  must say the run's verification was incomplete

A loop that reports fewer beads honestly is worth more than one that reports all of them
and is wrong about half.
