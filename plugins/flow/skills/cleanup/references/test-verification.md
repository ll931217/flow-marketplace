# TDD Test Verification (Quality Gate)

## Overview

Before cleanup can proceed, ALL tests must pass. This is a mandatory quality gate enforced during the cleanup process. No merge or final commit should occur with failing tests unless the user explicitly overrides.

## Test Command Detection

The test command is auto-detected based on project files:

| Project File | Language/Framework | Test Command |
|-------------|-------------------|--------------|
| `package.json` | Node.js / TypeScript | `npm test` |
| `Cargo.toml` | Rust | `cargo test` |
| `pyproject.toml`, `setup.py`, `requirements.txt` | Python | `pytest` |
| `go.mod` | Go | `go test ./...` |
| `pom.xml`, `build.gradle` | Java / Kotlin | `mvn test` |

If no project file is detected, display a warning and allow manual verification.

## Helper Function

```bash
verify_all_tests_pass() {
  echo "Verifying test suite..."

  # Detect test command based on project type
  if [ -f "package.json" ]; then
    TEST_CMD="npm test"
  elif [ -f "Cargo.toml" ]; then
    TEST_CMD="cargo test"
  elif [ -f "pyproject.toml" ] || [ -f "setup.py" ] || [ -f "requirements.txt" ]; then
    TEST_CMD="pytest"
  elif [ -f "go.mod" ]; then
    TEST_CMD="go test ./..."
  elif [ -f "pom.xml" ] || [ -f "build.gradle" ]; then
    TEST_CMD="mvn test"
  else
    echo "Could not auto-detect test command"
    echo "Please run tests manually and confirm all pass"
    return 0  # Allow manual verification
  fi

  echo "Running: $TEST_CMD"
  if eval "$TEST_CMD"; then
    echo ""
    echo "ALL TESTS PASSING!"
    echo ""
    # Check for coverage reports
    if [ -f "coverage/lcov-report/index.html" ]; then
      echo "Coverage report available: coverage/lcov-report/index.html"
    elif [ -f ".nyc_output/index.json" ]; then
      echo "Coverage data: .nyc_output/index.json"
    fi
    return 0
  else
    echo ""
    echo "TESTS ARE FAILING!"
    echo ""
    echo "Cannot proceed with cleanup until all tests pass."
    return 1
  fi
}
```

## When Tests Pass

- Display passing status with test count and coverage (if available)
- Proceed to next cleanup step (worktree check or summary commit)

Example output:
```
All Tests Passing!
Total: X tests passed
Coverage: Y%
```

## When Tests Fail

1. Display failing status with test failure summary
2. Do NOT proceed to merge or cleanup
3. Present options via `AskUserQuestion`:

| Option | Description |
|--------|-------------|
| Fix and retest | Stop cleanup to fix failing tests, then retry |
| View test failures | Show which tests are failing |
| Continue anyway (RISKY) | Proceed despite failing tests (not recommended) |

**If user selects "Continue anyway":**
- Display a prominent warning about merging failing tests
- Proceed with cleanup but document the override in the commit message
- The commit message should include a note about test failures

## Integration with Cleanup Flow

This verification runs as Step 2d in the cleanup process, after task completion verification and before worktree merge. It is a blocking gate: no merge or final commit should happen with failing tests unless explicitly overridden by the user.
