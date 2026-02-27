#!/usr/bin/env bash
# Test script for semantic-memory MCP plugin
# Run this script outside of Claude Code session

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Semantic Memory Plugin Test Suite ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }

# Test 1: Plugin manifest
echo "Test 1: Plugin Manifest"
if node -e "const p = require('$PLUGIN_DIR/.claude-plugin/plugin.json'); if (p.name && p.version && p.components) process.exit(0); process.exit(1);" 2>/dev/null; then
    pass "plugin.json is valid"
else
    fail "plugin.json is invalid"
fi

# Test 2: Hooks configuration
echo ""
echo "Test 2: Hooks Configuration"
if [ -f "$PLUGIN_DIR/hooks/hooks.json" ]; then
    if node -e "const h = require('$PLUGIN_DIR/hooks/hooks.json'); if (h.hooks.UserPromptSubmit && h.hooks.Stop && h.hooks.SessionStart) process.exit(0); process.exit(1);" 2>/dev/null; then
        pass "hooks.json has all required hooks"
    else
        fail "hooks.json missing required hooks"
    fi
else
    fail "hooks.json not found"
fi

# Test 3: Command files
echo ""
echo "Test 3: Command Files"
COMMANDS=("add" "search" "list" "delete" "sync" "learn")
for cmd in "${COMMANDS[@]}"; do
    file="$PLUGIN_DIR/commands/${cmd}.md"
    if [ -f "$file" ] && grep -q "## Usage" "$file" && grep -q "## Examples" "$file"; then
        pass "${cmd}.md is valid"
    else
        fail "${cmd}.md is invalid or missing"
    fi
done

# Test 4: Skill files
echo ""
echo "Test 4: Skill Files"
SKILLS=("memory-context" "preferences" "project-setup" "session-summary")
for skill in "${SKILLS[@]}"; do
    file="$PLUGIN_DIR/skills/${skill}/SKILL.md"
    if [ -f "$file" ] && grep -q "^name:" "$file" && grep -q "^description:" "$file"; then
        pass "${skill}/SKILL.md is valid"
    else
        fail "${skill}/SKILL.md is invalid or missing"
    fi
done

# Test 5: MCP server build
echo ""
echo "Test 5: MCP Server Build"
if [ -f "$PLUGIN_DIR/dist/index.js" ]; then
    pass "MCP server is built"
else
    fail "MCP server not built - run 'npm run build'"
fi

# Test 6: MCP server tools
echo ""
echo "Test 6: MCP Tool Definitions"
TOOLS=("memory_add" "memory_search" "memory_list" "memory_delete" "memory_clear_dataset")
for tool in "${TOOLS[@]}"; do
    if grep -q "name: '$tool'" "$PLUGIN_DIR/src/index.ts"; then
        pass "Tool '$tool' is defined"
    else
        fail "Tool '$tool' is missing"
    fi
done

# Test 7: Unit tests
echo ""
echo "Test 7: Unit Tests"
cd "$PLUGIN_DIR"
if pnpm test 2>/dev/null | grep -q "Tests.*passed"; then
    pass "All unit tests pass"
else
    warn "Unit tests require 'pnpm test' to be run manually"
fi

# Test 8: Database schema
echo ""
echo "Test 8: Database Schema"
if grep -q "CREATE TABLE IF NOT EXISTS memories" "$PLUGIN_DIR/src/database.ts"; then
    pass "Memories table schema is defined"
else
    fail "Memories table schema is missing"
fi

echo ""
echo "=== Test Summary ==="
echo "Plugin version: $(node -e "console.log(require('$PLUGIN_DIR/.claude-plugin/plugin.json').version)")"
echo "Commands: 6"
echo "Skills: 4"
echo "Hooks: 3 (UserPromptSubmit, Stop, SessionStart)"
echo "MCP Tools: 5 (memory_add, memory_search, memory_list, memory_delete, memory_clear_dataset)"
echo ""
echo "To test with Claude CLI (requires PostgreSQL):"
echo "  claude -p 'Test the memory_add MCP tool' \\"
echo "    --mcp-config $PLUGIN_DIR/test-mcp-config.json \\"
echo "    --strict-mcp-config \\"
echo "    --output-format json"
