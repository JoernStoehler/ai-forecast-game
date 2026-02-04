#!/bin/bash
# Setup script for Claude Code web environment
# Run with: npm run setup:ccweb

set -e

# Save the project root directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Claude Code Web Setup ==="

# Check if running on CC web (informational only)
if [ -z "$CLAUDE_CODE_REMOTE" ]; then
    echo "Note: CLAUDE_CODE_REMOTE not set. Running outside Claude Code web."
fi

# Install gh CLI if not present
if ! command -v gh &> /dev/null; then
    echo "Installing GitHub CLI..."

    GH_VERSION="2.67.0"
    GH_ARCHIVE="gh_${GH_VERSION}_linux_amd64.tar.gz"
    GH_URL="https://github.com/cli/cli/releases/download/v${GH_VERSION}/${GH_ARCHIVE}"

    INSTALL_DIR="$HOME/.local"
    mkdir -p "$INSTALL_DIR/bin"

    # Download and extract
    cd /tmp
    curl -sLO "$GH_URL"
    tar -xzf "$GH_ARCHIVE"
    mv "gh_${GH_VERSION}_linux_amd64/bin/gh" "$INSTALL_DIR/bin/"
    rm -rf "$GH_ARCHIVE" "gh_${GH_VERSION}_linux_amd64"

    # Add to PATH if not already there
    if [[ ":$PATH:" != *":$INSTALL_DIR/bin:"* ]]; then
        export PATH="$INSTALL_DIR/bin:$PATH"
        echo "Added $INSTALL_DIR/bin to PATH"
        echo ""
        echo "To make this permanent, add to your shell profile:"
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi

    echo "gh CLI installed: $(gh --version | head -1)"
else
    echo "gh CLI already installed: $(gh --version | head -1)"
fi

# Install npm dependencies
echo ""
echo "Installing npm dependencies..."
cd "$PROJECT_ROOT"
npm install

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  - Authenticate gh CLI: gh auth login"
echo "  - Run tests: npm test"
echo "  - Run e2e tests: npm run test:e2e"
