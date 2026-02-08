#!/bin/bash
# index-codebase.sh - Index a codebase for semantic search

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_SERVER_DIR="$(dirname "$SCRIPT_DIR")/mcp-server"

PROJECT_PATH="${1:-.}"
DATABASE_URL="${DATABASE_URL:-postgresql://localhost/semantic_memory}"
CHUNK_SIZE="${CHUNK_SIZE:-500}"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

resolve_path() {
    local path="$1"
    if [[ -d "$path" ]]; then
        cd "$path"
        pwd
    elif [[ -f "$path" ]]; then
        cd "$(dirname "$path")"
        echo "$(pwd)/$(basename "$path")"
    else
        log_error "Path does not exist: $path"
        exit 1
    fi
}

log_info "=== Semantic Memory Codebase Indexer ==="
echo

# Check prerequisites
if ! command -v node &> /dev/null; then
    log_error "Node.js not installed"
    exit 1
fi

if ! python3 -c "import sentence_transformers" &> /dev/null; then
    log_error "sentence-transformers not installed. Run: pip install sentence-transformers"
    exit 1
fi

if [[ ! -f "$MCP_SERVER_DIR/dist/index.js" ]]; then
    log_error "MCP server not built. Run: cd '$MCP_SERVER_DIR' && npm install && npm run build"
    exit 1
fi

project_path=$(resolve_path "$PROJECT_PATH")
log_info "Indexing: $project_path"

# Use the MCP server's index_project tool via stdin JSON-RPC
request=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "index_project",
    "arguments": {
      "project_path": "$project_path",
      "force_reindex": false
    }
  }
}
EOF
)

response=$(export DATABASE_URL="$DATABASE_URL" SEMANTIC_MEMORY_CHUNK_SIZE="$CHUNK_SIZE" && \
           node "$MCP_SERVER_DIR/dist/index.js" <<< "$request" 2>&1 || true)

# Parse result
if echo "$response" | grep -q '"error"'; then
    log_error "Indexing failed"
    echo "$response"
    exit 1
fi

log_info "Indexing complete!"
