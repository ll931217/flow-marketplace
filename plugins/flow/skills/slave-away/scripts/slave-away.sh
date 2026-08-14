#!/usr/bin/env bash
#
# slave-away.sh - Deterministic state keeping for the flow:slave-away backlog grinder.
#
# The model makes judgment calls (what a bead means, how to implement it). This
# script owns everything that must NOT be judged: what is in the queue, whether
# the run is finished, how many times a bead has failed, and what got deferred.
#
# Usage:
#   slave-away.sh preflight
#   slave-away.sh init [--run-id=<id>] [--isolation=worktree|in-place]
#                      [--worktree=<path>] [--priority=0,1] [--label=<l>] [--only=<ids>]
#   slave-away.sh gates set [--test=<cmd>] [--lint=<cmd>] [--typecheck=<cmd>]
#   slave-away.sh queue
#   slave-away.sh tick
#   slave-away.sh log --type=<t> [--bead=<id>] [--commit=<sha>] [--msg=<text>]
#   slave-away.sh defer --bead=<id> --command=<cmd> --why=<text> [--effect=<t>] [--verify=<t>]
#   slave-away.sh attempts <bead-id>
#   slave-away.sh status
#   slave-away.sh report
#
set -euo pipefail

die() {
  echo "slave-away: $*" >&2
  exit 1
}

command -v jq >/dev/null || die "jq is required"
command -v bd >/dev/null || die "bd (beads) is required"

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || die "not inside a git repository"
BASE_DIR="$PROJECT_ROOT/.flow/state/slave-away"
CURRENT_FILE="$BASE_DIR/current"

timestamp() { date -u +%Y-%m-%dT%H:%M:%SZ; }
epoch_of() { date -u -d "$1" +%s 2>/dev/null || echo 0; }

ensure_gitignored() {
  git -C "$PROJECT_ROOT" check-ignore -q "$BASE_DIR" 2>/dev/null && return 0
  printf '\n# flow:slave-away run state\n.flow/state/slave-away/\n' >>"$PROJECT_ROOT/.gitignore"
}

run_dir() {
  [[ -f "$CURRENT_FILE" ]] || die "no run in flight — run 'slave-away.sh init' first"
  local id
  id=$(cat "$CURRENT_FILE")
  local d="$BASE_DIR/$id"
  [[ -d "$d" ]] || die "run '$id' is registered but $d is missing"
  echo "$d"
}

RUN_JSON() { echo "$(run_dir)/run.json"; }
JOURNAL() { echo "$(run_dir)/journal.jsonl"; }
DEFERRED() { echo "$(run_dir)/deferred.jsonl"; }

# Parse --key=value args into shell vars named ARG_<key> (dashes -> underscores).
parse_args() {
  for arg in "$@"; do
    case "$arg" in
    --*=*)
      local k="${arg%%=*}"
      k="${k#--}"
      k="${k//-/_}"
      printf -v "ARG_${k}" '%s' "${arg#*=}"
      ;;
    esac
  done
}

# Run a bd query and normalize to a JSON array. Fails loud: a bd error must never
# be read as "the queue is empty", which would end the run with a false green.
bd_json() {
  local out rc
  set +e
  out=$(bd "$@" --json 2>&1)
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    echo "slave-away: 'bd $* --json' failed (exit $rc):" >&2
    echo "$out" >&2
    exit "$rc"
  fi
  echo "$out" | jq -c '
    if type == "array" then .
    elif type == "object" and has("issues") then .issues
    elif type == "object" and has("data") then .data
    else error("unrecognized bd --json shape: \(keys? // type)")
    end'
}

# --- preflight -------------------------------------------------------------

cmd_preflight() {
  local problems=0

  if ! bd stats >/dev/null 2>&1; then
    echo "FAIL  beads is not reachable. Recover before grinding:" >&2
    bd stats 2>&1 | sed 's/^/      /' >&2 || true
    echo "      Likely fix: bd bootstrap" >&2
    problems=1
  else
    echo "ok    beads reachable"
  fi

  local branch
  branch=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD)
  case "$branch" in
  main | master | develop | release/*)
    echo "WARN  on protected branch '$branch' — isolate into a worktree before grinding"
    ;;
  *) echo "ok    branch '$branch'" ;;
  esac

  if [[ -n "$(git -C "$PROJECT_ROOT" status --porcelain)" ]]; then
    echo "WARN  working tree is dirty — uncommitted changes will be mixed into the run"
  else
    echo "ok    working tree clean"
  fi

  if [[ -f "$CURRENT_FILE" ]]; then
    echo "note  run '$(cat "$CURRENT_FILE")' already in flight — resume it, do not re-init"
  fi

  [[ $problems -eq 0 ]] || exit 1
}

# --- init ------------------------------------------------------------------

cmd_init() {
  local ARG_run_id="" ARG_isolation="worktree" ARG_worktree="" \
    ARG_priority="" ARG_label="" ARG_only=""
  parse_args "$@"

  mkdir -p "$BASE_DIR"
  ensure_gitignored

  if [[ -f "$CURRENT_FILE" ]]; then
    echo "Run already in flight: $(cat "$CURRENT_FILE") — resuming (init is a no-op)"
    return 0
  fi

  # Fail loud rather than recording an empty base commit — the report's diff range
  # and every "what did this run change" answer depend on it.
  local base_commit
  base_commit=$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null) ||
    die "HEAD does not resolve (empty repository?) — commit something before grinding"

  local id="${ARG_run_id:-$(date -u +%Y%m%d-%H%M%S)}"
  local d="$BASE_DIR/$id"
  mkdir -p "$d"
  : >"$d/journal.jsonl"
  : >"$d/deferred.jsonl"

  jq -n \
    --arg run_id "$id" \
    --arg started_at "$(timestamp)" \
    --arg base_commit "$base_commit" \
    --arg branch "$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD)" \
    --arg isolation "$ARG_isolation" \
    --arg worktree "$ARG_worktree" \
    --arg priority "$ARG_priority" \
    --arg label "$ARG_label" \
    --arg only "$ARG_only" \
    '{
      run_id: $run_id, started_at: $started_at, base_commit: $base_commit,
      branch: $branch, isolation: $isolation,
      worktree: (if $worktree == "" then null else $worktree end),
      iteration: 0, no_progress_ticks: 0, last_closed_count: 0,
      gates: {test: null, lint: null, typecheck: null},
      scope: {
        priority: (if $priority == "" then null else ($priority | split(",")) end),
        label:    (if $label == "" then null else $label end),
        only:     (if $only == "" then null else ($only | split(",")) end)
      },
      breakers: {
        max_attempts: 3, max_consecutive_failures: 3, max_iterations: 50,
        max_wall_clock_seconds: 14400, max_no_progress_ticks: 2
      }
    }' >"$d/run.json"

  echo "$id" >"$CURRENT_FILE"
  echo "Run initialized: $id  ($d)"
}

cmd_gates() {
  [[ "${1:-}" == "set" ]] || die "usage: slave-away.sh gates set [--test=..] [--lint=..] [--typecheck=..]"
  shift
  local ARG_test="" ARG_lint="" ARG_typecheck=""
  parse_args "$@"
  local f
  f=$(RUN_JSON)
  jq --arg t "$ARG_test" --arg l "$ARG_lint" --arg c "$ARG_typecheck" '
    .gates.test      = (if $t == "" then .gates.test      else $t end) |
    .gates.lint      = (if $l == "" then .gates.lint      else $l end) |
    .gates.typecheck = (if $c == "" then .gates.typecheck else $c end)
  ' "$f" >"$f.tmp" && mv "$f.tmp" "$f"
  jq -c '.gates' "$f"
}

# --- queue -----------------------------------------------------------------

# Apply the run's scope filter to a bead array.
scope_filter() {
  local run
  run=$(cat "$(RUN_JSON)")
  jq -c --argjson scope "$(echo "$run" | jq -c '.scope')" '
      (if $scope.priority == null then .
       else map(. as $i | select($scope.priority | index(($i.priority // 2) | tostring) != null)) end)
    | (if $scope.label == null then .
       else map(select((.labels // []) | index($scope.label) != null)) end)
    | (if $scope.only == null then .
       else map(. as $i | select($scope.only | index($i.id) != null)) end)
  '
}

cmd_queue() {
  local ready in_progress open_all
  ready=$(bd_json ready | scope_filter)
  in_progress=$(bd_json list --status=in_progress | scope_filter)
  open_all=$(bd_json list --status=open | scope_filter)

  jq -n \
    --argjson ready "$ready" \
    --argjson in_progress "$in_progress" \
    --argjson open_all "$open_all" '
    {
      ready: ($ready | map({id, title, priority, type: (.issue_type // .type)})),
      in_progress: ($in_progress | map({id, title})),
      open_not_ready: (
        ($open_all | map(.id)) - ($ready | map(.id)) - ($in_progress | map(.id))
      ),
      counts: {
        ready: ($ready | length),
        in_progress: ($in_progress | length),
        open: ($open_all | length)
      },
      terminal: (($ready | length) == 0 and ($in_progress | length) == 0)
    }'
}

# --- tick ------------------------------------------------------------------

closed_count() { awk '/"type":"closed"/ {n++} END {print n+0}' "$(JOURNAL)"; }

consecutive_failures() {
  # Walk the journal backwards; count trailing 'failed' events since the last 'closed'.
  awk '
    /"type":"closed"/ { n=0; next }
    /"type":"failed"/ { n++ }
    END { print n+0 }
  ' "$(JOURNAL)"
}

cmd_tick() {
  local f
  f=$(RUN_JSON)
  local run
  run=$(cat "$f")
  local q
  q=$(cmd_queue)

  local closed
  closed=$(closed_count)
  local last_closed
  last_closed=$(echo "$run" | jq -r '.last_closed_count')
  local no_prog
  no_prog=$(echo "$run" | jq -r '.no_progress_ticks')
  local terminal
  terminal=$(echo "$q" | jq -r '.terminal')

  if [[ "$closed" -gt "$last_closed" ]]; then no_prog=0; else no_prog=$((no_prog + 1)); fi
  # A drained queue is finished, not stalled — don't let it trip the no-progress breaker.
  if [[ "$terminal" == "true" ]]; then no_prog=0; fi

  local started elapsed
  started=$(echo "$run" | jq -r '.started_at')
  elapsed=$(($(date -u +%s) - $(epoch_of "$started")))

  jq --argjson closed "$closed" --argjson np "$no_prog" \
    '.iteration += 1 | .last_closed_count = $closed | .no_progress_ticks = $np' \
    "$f" >"$f.tmp" && mv "$f.tmp" "$f"

  jq -n \
    --argjson run "$(cat "$f")" \
    --argjson q "$q" \
    --argjson elapsed "$elapsed" \
    --argjson closed "$closed" \
    --argjson consec "$(consecutive_failures)" '
    ($run.breakers) as $b |
    {
      iteration: $run.iteration,
      elapsed_seconds: $elapsed,
      closed_so_far: $closed,
      queue: $q.counts,
      terminal: $q.terminal,
      stop_reason: (
        if $q.terminal then "queue-drained"
        elif $run.iteration        >= $b.max_iterations          then "breaker:max-iterations"
        elif $elapsed              >= $b.max_wall_clock_seconds  then "breaker:wall-clock"
        elif $consec               >= $b.max_consecutive_failures then "breaker:consecutive-failures"
        elif $run.no_progress_ticks >= $b.max_no_progress_ticks   then "breaker:no-progress"
        else null end
      )
    } | .stop = (.stop_reason != null)'
}

# --- journal ---------------------------------------------------------------

cmd_log() {
  local ARG_type="" ARG_bead="" ARG_commit="" ARG_msg="" ARG_discovered=""
  parse_args "$@"
  [[ -n "$ARG_type" ]] || die "log requires --type="

  # Closing is the one moment that always happens, so it is where the discovery
  # question gets asked. Prose asking politely got skipped in every benchmark run;
  # a required flag cannot be. "none" is a valid answer -- silence is not.
  if [[ "$ARG_type" == "closed" && -z "$ARG_discovered" ]]; then
    die "closing <${ARG_bead:-?}> requires --discovered=<bead-ids|none>.
Before closing, answer in one line each:
  1. What did I touch but not fix?
  2. What did I read that looked wrong?
  3. What does this change now make obviously necessary?
File a bead for each real answer (bd create ... --deps discovered-from:${ARG_bead:-<id>}),
then pass their ids: --discovered=bd-91,bd-92
If every honest answer is nothing, pass --discovered=none."
  fi

  jq -nc --arg ts "$(timestamp)" --arg type "$ARG_type" --arg bead "$ARG_bead" \
    --arg commit "$ARG_commit" --arg msg "$ARG_msg" --arg disc "$ARG_discovered" \
    '{ts: $ts, type: $type}
     + (if $bead   == "" then {} else {bead: $bead}     end)
     + (if $commit == "" then {} else {commit: $commit} end)
     + (if $msg    == "" then {} else {msg: $msg}       end)
     + (if $disc   == "" then {} else {discovered: $disc} end)' >>"$(JOURNAL)"
}

cmd_attempts() {
  local bead="${1:-}"
  [[ -n "$bead" ]] || die "usage: slave-away.sh attempts <bead-id>"
  jq -s --arg b "$bead" '[.[] | select(.bead == $b and .type == "failed")] | length' "$(JOURNAL)"
}

# --- deferred actions ------------------------------------------------------

cmd_defer() {
  local ARG_bead="" ARG_command="" ARG_why="" ARG_effect="" ARG_verify=""
  parse_args "$@"
  [[ -n "$ARG_command" ]] || die "defer requires --command="
  [[ -n "$ARG_why" ]] || die "defer requires --why= (a deferred action with no reason is unactionable)"
  jq -nc --arg ts "$(timestamp)" --arg bead "$ARG_bead" --arg command "$ARG_command" \
    --arg why "$ARG_why" --arg effect "$ARG_effect" --arg verify "$ARG_verify" \
    '{ts: $ts, bead: $bead, command: $command, why: $why, effect: $effect, verify: $verify}' \
    >>"$(DEFERRED)"
  cmd_log --type=deferred --bead="$ARG_bead" --msg="$ARG_command"
  echo "Deferred action recorded for ${ARG_bead:-<no bead>}"
}

# --- status / report -------------------------------------------------------

cmd_status() { jq -c . "$(RUN_JSON)"; }

cmd_report() {
  local run
  run=$(cat "$(RUN_JSON)")
  local d
  d=$(run_dir)
  local started elapsed
  started=$(echo "$run" | jq -r '.started_at')
  elapsed=$(($(date -u +%s) - $(epoch_of "$started")))

  echo "# Slave Away — run $(echo "$run" | jq -r '.run_id')"
  echo
  printf 'Started %s · ran %dh %dm · branch `%s`\n' \
    "$started" $((elapsed / 3600)) $(((elapsed % 3600) / 60)) "$(echo "$run" | jq -r '.branch')"
  echo

  local ndef
  ndef=$(wc -l <"$d/deferred.jsonl" | tr -d ' ')
  if [[ "$ndef" -gt 0 ]]; then
    echo "## ⚠ Deferred actions — $ndef command(s) for you to run"
    echo
    echo "The loop is forbidden from running these. Nothing here has happened yet."
    echo
    jq -r '
      "### \(.bead // "no bead") — \(.why)\n\n```bash\n\(.command)\n```\n" +
      (if .effect != "" then "**Effect:** \(.effect)\n" else "" end) +
      (if .verify != "" then "**Verify:** \(.verify)\n" else "" end)
    ' "$d/deferred.jsonl"
    echo
  else
    echo "## Deferred actions"
    echo
    echo "None — nothing in this run required a forbidden command."
    echo
  fi

  echo "## Closed beads"
  echo
  jq -r 'select(.type == "closed") | "- `\(.bead)` — \(.msg // "closed") (`\(.commit // "no commit")`)"' \
    "$d/journal.jsonl" | grep . || echo "None."
  echo
  echo "## Blocked / needs a human"
  echo
  jq -r 'select(.type == "blocked") | "- `\(.bead)` — \(.msg // "blocked")"' \
    "$d/journal.jsonl" | grep . || echo "None."
  echo
  echo "## Discovered work filed this run"
  echo
  jq -r 'select(.type == "discovered") | "- `\(.bead)` — \(.msg // "")"' \
    "$d/journal.jsonl" | grep . || echo "None."
  echo
  # Anything logged under a type this renderer doesn't know about still has to
  # surface -- a journal entry that renders nowhere is a silent loss, which is the
  # exact failure the journal exists to prevent.
  local misc
  misc=$(jq -r 'select(.type | IN("start","closed","blocked","discovered","deferred","failed") | not)
                | "- `\(.type)` \(.bead // "") — \(.msg // "")"' "$d/journal.jsonl")
  if [[ -n "$misc" ]]; then
    echo "## Other journal entries"
    echo
    echo "$misc"
    echo
  fi

  echo "## Verification"
  echo
  # Name the gates that were configured. An unconfigured gate is a finding, not a
  # blank row -- silence here reads as "verified" when nothing was actually run.
  local any_gate=0
  for g in test lint typecheck; do
    local cmd
    cmd=$(echo "$run" | jq -r ".gates.$g // empty")
    if [[ -n "$cmd" ]]; then
      echo "- **$g**: \`$cmd\` — re-run this and record the result before presenting"
      any_gate=1
    else
      echo "- **$g**: none configured in this project — NOT verified"
    fi
  done
  [[ "$any_gate" -eq 1 ]] || echo
  [[ "$any_gate" -eq 1 ]] || echo "_No gates were configured. This run's verification is incomplete; say so plainly._"
  echo
  echo "## Next"
  echo
  echo '```bash'
  echo "cd $(echo "$run" | jq -r '.worktree // "."')"
  echo "git log --oneline $(echo "$run" | jq -r '.base_commit')..HEAD   # review"
  echo "git push                                       # the loop refused to do this"
  echo '```'
  echo
  echo "_Verify this against \`git log\` and \`bd list --all\` before presenting it._"
}

# --- dispatch --------------------------------------------------------------

case "${1:-}" in
preflight)
  shift
  cmd_preflight "$@"
  ;;
init)
  shift
  cmd_init "$@"
  ;;
gates)
  shift
  cmd_gates "$@"
  ;;
queue)
  shift
  cmd_queue "$@"
  ;;
tick)
  shift
  cmd_tick "$@"
  ;;
log)
  shift
  cmd_log "$@"
  ;;
defer)
  shift
  cmd_defer "$@"
  ;;
attempts)
  shift
  cmd_attempts "$@"
  ;;
status)
  shift
  cmd_status "$@"
  ;;
report)
  shift
  cmd_report "$@"
  ;;
*)
  sed -n '2,30p' "$0"
  exit 1
  ;;
esac
