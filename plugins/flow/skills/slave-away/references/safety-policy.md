# Safety policy — what an unattended loop may never do

The loop runs for hours with nobody watching. That changes the calculus on every
irreversible action: there is no human to catch a bad judgement between the decision
and the effect. So the rule is not "be careful" — it is **the loop does not have the
capability, and defers instead**.

Deferring is not failing. A deferred action is a finished piece of analysis handed to
the human as a copy-pasteable command. The loop's job is to do everything *up to* the
boundary so the human's remaining work is one command and one verification.

## The deny list

### Publishing and outward-facing actions

Anything that leaves the machine or becomes visible to other people. Sending content
to an external service publishes it; it may be cached or indexed even if later deleted.

- `git push` in any form, including `--force`, tag pushes, and pushes to a fork
- Deleting or force-updating any branch other than the run's own worktree branch
- Rewriting history that already exists on a remote (`rebase`/`amend` on pushed commits)
- `bd dolt push`, `bd sync --push`, or any beads remote write
- Creating, updating, or merging a PR/MR (`gh pr`, `glab mr`)
- Posting to Jira, GitLab, Slack, Mattermost, email, or any webhook
- Publishing a package (`npm publish`, `cargo publish`, `pypi upload`, image push)

### Production and shared data

- Any write against a database that is not a disposable local instance:
  `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, `UPDATE`, `INSERT`, `CREATE`
- Running a migration against anything but a local throwaway DB
- Reading production data into the repo or into a fixture

Treat a DSN as production unless you can prove otherwise. Local means `localhost`,
`127.0.0.1`, or a container the run itself started. A hostname you recognize from the
company's infrastructure is production, even if the connection string says `dev`.

### Deploy and infrastructure

- `kubectl apply|delete|rollout`, `helm install|upgrade`
- `terraform apply|destroy`, `pulumi up`
- Komodo deploy/build/execute, Airflow `trigger_dag`/`clear`, CI pipeline triggers
- `docker push` to a shared registry; `docker rm`/`down` against a shared host
- systemd/cron changes on a shared machine (`crontab -` is a destructive sink: a failed
  upstream yields empty input and wipes the crontab)

### Secrets

- `gopass insert|rm|generate`, rotating or issuing any credential
- Writing a real secret into a file, fixture, test, or commit
- Editing `.env` outside the run's own worktree

### Environment and filesystem

- Anything outside the run's worktree: `rm -rf`, file edits, moves
- In-place changes to a shared env, base interpreter, or global lockfile. Package
  managers resolve config by walking upward, so an install typed "here" can govern
  every consumer the walk reaches — build the boundary first (venv, container,
  workspace scope marker), then assert the shared consumer is unaffected.
- `sudo` anything

### The catch-all

If an action is irreversible, affects something outside this worktree, or would be
embarrassing to discover at 3am — defer it. When genuinely unsure whether something
qualifies, defer. A false deferral costs the human ten seconds of reading; a false
execution can cost a weekend.

## What "build up to the boundary" means

The point is to leave the human with the smallest possible remaining step. Concretely:

| The bead needs | The loop does | The loop defers |
|---|---|---|
| A schema change in prod | Writes the migration file, writes its rollback, runs it against a local DB, tests against the new schema | Running it against prod |
| A deploy | Writes/updates the manifest, validates it (`kubectl apply --dry-run=client`, `terraform plan`) | The apply |
| A dependency bump | Bumps it in an isolated env, runs the full test suite there | Bumping the shared/global env |
| An API call to a prod service | Writes the client + tests against a mock/fixture | Any call to the real endpoint |
| A credential | Reads the *shape* required, wires the config to read from the store | Creating/rotating the actual secret |
| A branch that's ready | Commits everything, leaves the branch clean | The push and the MR |

Then close the bead **only if the implementable part is complete and verified**. If the
bead's acceptance criteria genuinely require the deferred step, leave the bead open,
attach the deferred action, and note it in the bead:

```bash
bd update <id> --notes="Implementation complete; blocked on deferred action: <command>"
```

## Deferred-action record

```bash
bash "$SA" defer --bead=<id> \
  --command='<exact command, copy-pasteable, no placeholders the human must guess>' \
  --why='<what in the bead required it>' \
  --effect='<what changes when it runs>' \
  --verify='<the command or observation that confirms it worked>'
```

Schema (`deferred.jsonl`, one JSON object per line):

| Field | Required | Notes |
|---|---|---|
| `ts` | auto | UTC timestamp |
| `bead` | yes | which issue needed it |
| `command` | yes | exact and runnable. `cd`-qualified if the directory matters |
| `why` | yes | the script refuses a record without it — an unexplained command is unactionable |
| `effect` | recommended | what state changes; what is irreversible about it |
| `verify` | recommended | how the human confirms it landed |

Write `command` verbatim as it should be run. Never paraphrase, never leave a
`<YOUR_HOST>` the human has to fill in — if a value is unknown, say so in `why` and
give the command that discovers it.

## Where this lands

Deferred actions are the **first section** of the final report, ahead of everything the
loop did successfully. That ordering is deliberate: the successes are already done, and
the deferrals are the only part that still needs a human.
