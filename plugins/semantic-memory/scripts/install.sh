#!/bin/bash
#
# install.sh - Automatic installation script for Semantic Memory MCP server
# This script is run automatically when the plugin is installed via Claude Code

set -euo pipefail

# Colors
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_SERVER_DIR="$(dirname "$SCRIPT_DIR")"

log_info "=== Semantic Memory MCP Server Installation ==="
echo

# Check Node.js
log_info "Checking Node.js..."
if ! command -v node &> /dev/null; then
    log_error "Node.js 18+ is required but not installed"
    log_info "Install from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js 18+ is required (found $(node -v))"
    exit 1
fi
log_info "Node.js $(node -v) found"

# Install npm dependencies
log_info "Installing npm dependencies..."
cd "$MCP_SERVER_DIR/mcp-server"
if [ ! -d "node_modules" ]; then
    npm install
else
    log_info "npm dependencies already installed"
fi

# Build TypeScript
log_info "Building TypeScript server..."
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
    npm run build
else
    log_info "TypeScript already built"
fi

# Check Python
log_info "Checking Python..."
if ! command -v python3 &> /dev/null; then
    log_warn "Python 3.10+ not found. Required for embedding generation."
    log_info "Install from: https://www.python.org/downloads/"
    log_info "After installation, run: pip install sentence-transformers numpy"
else
    PYTHON_VERSION=$(python3 --version | awk '{print $2}')
    log_info "Python $PYTHON_VERSION found"

    # Check sentence-transformers
    if ! python3 -c "import sentence_transformers" &> /dev/null; then
        log_warn "sentence-transformers not installed"
        log_info "Install with: pip install sentence-transformers numpy"
    else
        log_info "sentence-transformers already installed"
    fi
fi

# Check PostgreSQL
log_info "Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version | awk '{print $3}' | cut -d'.' -f1)
    log_info "PostgreSQL $PG_VERSION found"
else
    log_warn "PostgreSQL not found. Required for semantic memory storage."
    log_info "Install from: https://www.postgresql.org/download/"
    log_info "Enable pgvector: CREATE EXTENSION vector;"
fi

# Set up environment template
log_info "Setting up environment configuration..."
ENV_FILE="$MCP_SERVER_DIR/.env.example"
cat > "$ENV_FILE" << 'EOF'
# Semantic Memory MCP Server Configuration
# Copy this file to .env and update with your settings

# PostgreSQL connection URL (required)
DATABASE_URL="postgresql://localhost/semantic_memory"

# Alternative: Use SEMANTIC_MEMORY_PG_URL
# SEMANTIC_MEMORY_PG_URL="postgresql://localhost/semantic_memory"

# Embedding model (optional, default: all-MiniLM-L6-v2)
# SEMANTIC_MEMORY_EMBEDDING_MODEL="all-MiniLM-L6-v2"

# Chunk size for indexing (optional, default: 500 tokens)
# SEMANTIC_MEMORY_CHUNK_SIZE="500"
EOF

log_info "Environment template created at: $ENV_FILE"
log_info "Copy to .env and configure as needed"

echo
log_info "=== Installation Complete ==="
echo
log_info "Next steps:"
echo "  1. Set up PostgreSQL with pgvector extension"
echo "  2. Create database: createdb semantic_memory"
echo "  3. Configure DATABASE_URL environment variable"
echo "  4. (Optional) Install Python dependencies: pip install sentence-transformers numpy"
echo
log_warn "To start using the MCP server, restart Claude Code or reload plugins."
