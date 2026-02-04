#!/usr/bin/env bash
# Devcontainer post-create setup for ai-forecast-game

set -euo pipefail

echo "Post-create setup starting..."

# Ensure user directories exist
sudo mkdir -p \
  "${HOME}/.config" \
  "${HOME}/.local" \
  "${HOME}/.cache"
sudo chown -R "${USER}:${USER}" \
  "${HOME}/.config" \
  "${HOME}/.local" \
  "${HOME}/.cache"

# Configure npm paths
if command -v npm >/dev/null 2>&1; then
  mkdir -p "${HOME}/.local/bin" "${HOME}/.cache/npm"
  npm config set prefix "${HOME}/.local"
  npm config set cache "${HOME}/.cache/npm"
fi

# Configure git credentials via GitHub CLI
if command -v gh >/dev/null 2>&1; then
  gh auth setup-git || true
fi

# Install project dependencies if package.json exists
if [ -f "package.json" ]; then
  echo "Installing npm dependencies..."
  npm install
fi

# Install Playwright browsers (cached via bind mount)
if [ -f "package.json" ] && grep -q '"@playwright/test"' package.json 2>/dev/null; then
  echo "Installing Playwright browsers..."
  npx playwright install
fi

# Install Claude Code CLI
curl -fsSL https://claude.ai/install.sh | bash

# Verify tools
echo ""
echo "=== Tool versions ==="
echo "node: $(node -v)"
echo "npm: $(npm -v)"
echo "code-tunnel: $(code-tunnel --version 2>/dev/null || echo 'not found')"
echo "gh: $(gh --version | head -1)"
echo "ripgrep: $(rg --version | head -1)"

echo ""
echo "Post-create complete."
