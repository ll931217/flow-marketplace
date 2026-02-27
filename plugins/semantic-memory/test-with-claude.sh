#!/usr/bin/env bash
# Test semantic-memory MCP plugin with Claude CLI
# Run this script outside of Claude Code session

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"

# Database connection URL
DB_URL="postgresql://postgres.your-tenant-id:gLWQJtL5@192.168.1.27:5432/semantic_memory"

echo "=== Semantic Memory MCP Plugin - Claude CLI Test ==="
echo ""

# Check if claude CLI is available
if ! command -v claude &> /dev/null; then
    echo "Error: Claude CLI not found. Please install it first."
    exit 1
fi

# Check if the MCP server is built
if [ ! -f "$PLUGIN_DIR/dist/index.js" ]; then
    echo "Building MCP server..."
    cd "$PLUGIN_DIR"
    npm run build
fi

# Create MCP config
MCP_CONFIG="$PLUGIN_DIR/test-mcp-config.json"
cat > "$MCP_CONFIG" << EOF
{
  "mcpServers": {
    "semantic-memory": {
      "command": "node",
      "args": ["$PLUGIN_DIR/dist/index.js"],
      "env": {
        "SEMANTIC_MEMORY_PG_URL": "$DB_URL"
      }
    }
  }
}
EOF

echo "Testing MCP tools with Claude CLI..."
echo ""

# Test 1: List available tools
echo "Test 1: List available MCP tools"
echo "Command: claude -p 'List all available MCP tools from semantic-memory server' --mcp-config $MCP_CONFIG --strict-mcp-config --output-format json"
echo ""

# Test 2: Add a memory
echo "Test 2: Add a memory"
echo "Command: claude -p 'Use the memory_add MCP tool to add a memory: \"Use Zustand for state management in React projects\" to the user dataset with tags react,state' --mcp-config $MCP_CONFIG --strict-mcp-config --output-format json"
echo ""

# Test 3: Search memories
echo "Test 3: Search memories"
echo "Command: claude -p 'Use the memory_search MCP tool to search for \"state management\" in the user dataset' --mcp-config $MCP_CONFIG --strict-mcp-config --output-format json"
echo ""

# Test 4: List memories
echo "Test 4: List memories"
echo "Command: claude -p 'Use the memory_list MCP tool to list all memories in the user dataset' --mcp-config $MCP_CONFIG --strict-mcp-config --output-format json"
echo ""

echo "=== Running Tests ==="
echo ""

# Run Test 1
echo ">>> Test 1: Listing available tools..."
claude -p 'List all available MCP tools from semantic-memory server. Just list the tool names.' \
    --mcp-config "$MCP_CONFIG" \
    --strict-mcp-config \
    --output-format json 2>&1 | head -50

echo ""
echo ">>> Test 2: Adding a memory..."
claude -p 'Use the memory_add MCP tool to add this memory: "Use Zustand for state management in React projects" to dataset "user" with tags ["react", "state"]. Return the result.' \
    --mcp-config "$MCP_CONFIG" \
    --strict-mcp-config \
    --output-format json 2>&1 | head -50

echo ""
echo ">>> Test 3: Searching memories..."
claude -p 'Use the memory_search MCP tool to search for "state management" in dataset "user" with top_k=5. Return the results.' \
    --mcp-config "$MCP_CONFIG" \
    --strict-mcp-config \
    --output-format json 2>&1 | head -50

echo ""
echo ">>> Test 4: Listing memories..."
claude -p 'Use the memory_list MCP tool to list all memories in dataset "user" with limit=10. Return the results.' \
    --mcp-config "$MCP_CONFIG" \
    --strict-mcp-config \
    --output-format json 2>&1 | head -50

echo ""
echo "=== Tests Complete ==="
