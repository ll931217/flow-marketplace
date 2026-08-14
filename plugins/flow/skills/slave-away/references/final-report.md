# Final report

`bash "$SA" report` renders the skeleton from `journal.jsonl` and `deferred.jsonl`.
Read it, **verify it against reality**, fill in the parts a script can't know, then
present it.

Verification before presenting — the journal records what the loop *believed*:

```bash
git log --oneline <base-commit>..HEAD     # do the commits match the closed beads?
git status                                # anything uncommitted that should have been?
bd list --status=open --json              # what's actually still open
bd stats
```

If the journal and reality disagree, reality wins and the discrepancy goes in the report.

## Template

```markdown
# Slave Away — run <run-id>

**Ended:** <queue drained | breaker: which one>
**Closed:** <n> beads · **Commits:** <n> · **Ran:** <Xh Ym>
**Branch:** `<branch>` in `<worktree path>` — not pushed

## ⚠ Deferred actions — <n> command(s) for you to run

Nothing below has happened. The loop built everything up to these lines and stopped.

### <bead-id> — <why it was needed>

```bash
<exact command>
```

**Effect:** <what changes; what is irreversible>
**Verify:** <how to confirm it worked>

<repeat per deferred action>

## Closed

| Bead | What shipped | Commit |
|---|---|---|
| `bd-42` | <one line — what a reviewer needs to know> | `a1b2c3d` |

## Blocked — needs you

| Bead | The question | Already tried |
|---|---|---|
| `bd-57` | <answerable in one sentence, no code reading required> | <what was investigated> |

## Discovered during the run

| Bead | Found while working | Worked? |
|---|---|---|
| `bd-91` | `bd-42` | yes |
| `bd-92` | `bd-42` | no — out of scope (`--label=backend`) |

## Verification

| Gate | Command | Result |
|---|---|---|
| Tests | `<the actual command>` | <n> passed / <n> failed |
| Lint | `<...>` | clean |
| Types | `<...>` | clean |

<Anything NOT verified, stated plainly. "No typecheck configured in this project" is a
finding, not an omission.>

## Next

```bash
cd <worktree>
git log --oneline <base>..HEAD     # review
wt merge <branch>                  # or: git merge, once you're happy
git push                           # the loop refused to do this
```
```

## Rules for writing it

**Deferred actions go first.** Everything else in the report is already done. This
section is the only part that still needs a human, and burying it under a wall of
successes is how it gets missed.

**Report faithfully.** If gates failed, say so and quote the decisive line. If a bead
was closed on a partial implementation, name the part that's missing. If a gate couldn't
run, say the run's verification was incomplete rather than leaving the row blank. A loop
that overstates what it finished is worse than one that finished less — the human's
whole reason for trusting it unattended is that its report is accurate.

**One line per bead.** The human is scanning tens of these. "Added retry with backoff to
the S3 client (3 attempts, jittered)" is a line. Three paragraphs about the approach is
not — that belongs in the bead and the commit message, where the person who needs it
will look.

**Make the blocked questions answerable at a glance.** "Should expired drafts be deleted
or archived?" gets an answer in ten seconds. "Unclear requirements on bd-57" costs the
human a twenty-minute investigation, which is precisely the cost the loop existed to
avoid.

**No praise, no narration of effort.** No "successfully completed", no "worked hard on".
Counts and facts.

**Say what it deliberately didn't do.** Out-of-scope discoveries, refactors filed rather
than performed, tests it chose not to write. The silence of an unattended run is
ambiguous — it reads as "covered everything" unless the report says otherwise.
