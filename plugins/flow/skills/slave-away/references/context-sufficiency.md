# Context sufficiency — make the bead answer the question instead of the human

An unattended loop stops for exactly one reason more than any other: it doesn't
understand the task. The naive fix is to ask the user. The better fix is to notice that
the bead was under-specified, **go find the missing context, and write it into the
bead** — so the loop continues now, and never has to ask again.

This inverts the usual failure mode. A thin bead is not a blocker; it is the first
sub-task.

## The gate

Before claiming a bead, check for four signals:

| Signal | What good looks like | What thin looks like |
|---|---|---|
| **What & why** | "Users lose their draft when the session expires because the autosave only fires on blur. Persist to localStorage on an interval." | "Fix autosave" |
| **Acceptance** | "A draft survives a page reload within 5s of the last keystroke; covered by a test." | *(nothing)* |
| **Location** | `src/editor/autosave.ts:42`, or "the hook that owns draft state" | *(nothing)* |
| **Constraints** | "Don't add a dependency; the team rejected `yjs` in bd-88." | *(nothing)* |

The first three are required. The fourth is a bonus that prevents re-litigating settled
decisions — and its absence is often why an agent's "reasonable" choice gets rejected in
review.

## Enrichment recipes

Work these in order and stop as soon as the gate passes. Enrichment is a means, not a
project — if three of these produce a workable spec, don't run the rest.

**1. Read the bead's neighbourhood.** `bd show <id>` gives dependencies and the
`discovered-from` parent. The parent usually carries the context the child omitted.
Sibling beads under the same epic show the intended shape of the work.

**2. Search the project's memory.** `bd memories <keyword>` holds decisions from prior
sessions. This is where "we already tried that and it didn't work" lives.

**3. Locate the code.** Spawn `Explore` subagents (they're cheap and parallel) to find
the files, the existing pattern to match, and the tests that already cover the area.
Ask for a `file:line` map, not prose. Two or three focused agents beat one broad one.

**4. Read the git history of the touched area.** `git log -p --follow <file>` shows why
the code is the way it is. A bead saying "refactor X" often has an answer in the commit
that created X.

**5. Derive acceptance criteria from the existing tests.** If the area has tests, the
bead's acceptance criteria are usually "the existing behaviour, plus this". Naming the
specific test file makes the TDD step mechanical.

**6. Check the PRD, if one exists.** `.flow/prd-*.md` — beads created by
`flow:generate-tasks` inherit their real spec from there.

## Write it back

This is the step that is easy to skip and expensive to skip.

```bash
bd update <id> \
  --description="<what and why, in full sentences, as if for a stranger>" \
  --acceptance="<observable conditions that make this done>" \
  --design="<constraints and decisions that bound the solution>" \
  --notes="<file:line pointers, related beads, what was already ruled out>"
```

Three reasons it matters:

1. **The next iteration has none of your context.** After a compaction or a `/loop`
   re-entry, the only thing that survives is what's on disk. A bead enriched in memory
   is a bead that has to be re-enriched next tick.
2. **A human reading the bead later sees what the agent saw.** That is what makes the
   final report reviewable instead of a mystery.
3. **It converts a one-off into a permanent improvement.** The backlog gets better as
   the loop runs through it.

## When enrichment can't work

Some questions genuinely cannot be answered from the codebase, because the answer is a
choice, not a fact:

- Conflicting requirements between two beads with no stated precedence
- An unstated business rule ("what should happen when the balance is negative?")
- A user-visible decision with no technically correct answer (copy, pricing, UX)
- A trade-off the user has previously shown they want to make themselves
- Anything requiring a forbidden action to even *investigate* (see `safety-policy.md`)

For those:

```bash
bd update <id> --notes="Blocked on: <the precise question>. Already investigated: <what you found>. Options considered: <A vs B and their trade-offs>."
bd human <id>
bd update <id> --status=blocked
bash "$SA" log --type=blocked --bead=<id> --msg="<the question in one line>"
```

Then **move to the next bead**. The point of the flag is that the loop keeps going.

Write the question so the human can answer it in one sentence without opening the code.
"Should expired drafts be deleted or archived?" is answerable at a glance; "unclear
requirements" is not, and turns a 10-second decision into a 20-minute investigation.

## Calibration

Enrichment has a cost, and over-applied it becomes its own stall. Rough guide:

- **Trivial bead** (typo, config value, obvious one-liner): skip the gate, just do it.
- **Normal bead**: one or two recipes, a couple of minutes. Write back and proceed.
- **Thin bead on unfamiliar code**: full sweep, parallel Explore agents. Worth it — this
  is the bead that would otherwise wedge the run.
- **Still ambiguous after a full sweep**: that is the signal it's a product decision.
  Flag and move on. Don't do a third pass hoping for a different answer.
