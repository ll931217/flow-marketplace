# Autonomous Mode Detection

## Purpose

Determine whether a flow command is running autonomously (as part of `/flow:autonomous`) or interactively (invoked directly by the user). This controls checkpoint and confirmation behavior.

## Detection Rules

Before executing, evaluate these conditions in order:

1. **Direct invocation:** Command was invoked from `/flow:autonomous`
2. **Parent workflow:** A parent workflow or explicit autonomous flag is present
3. **Log format:** Conversation contains `[Maestro]` log entries or explicit mode flags
4. **Context signals:** Conversation context indicates autonomous execution

**Resolution:**
- If ANY condition matches: `autonomous_mode = true`
- If NO conditions match: `autonomous_mode = false` (interactive fallback)
- Log result: `[Maestro] Autonomous mode detected: {autonomous_mode}`
- Pass this flag to downstream commands to control their behavior

## Behavior: Autonomous Mode (true)

- **SKIP** all "Wait for Go" confirmations -- proceed directly
- **SKIP** AskUserQuestion checkpoints (except critical errors)
- No pauses, no confirmations, no interactive prompts
- Only stop for unrecoverable errors requiring human intervention

## Behavior: Interactive Mode (false)

- Follow normal checkpoint behavior
- Use AskUserQuestion for user confirmations
- Pause at "Wait for Go" gates before proceeding
