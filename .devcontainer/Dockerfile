FROM mcr.microsoft.com/devcontainers/base:ubuntu

ENV DEBIAN_FRONTEND=noninteractive

SHELL ["/bin/bash", "-lc"]

# -----------------------------------------------------------------------------
# Devcontainer image for ai-forecast-game
#
# Tech stack: React + Vite, Vitest, Cloudflare Pages/Workers
# Browser automation: Playwright, Puppeteer
#
# Layer order (for caching):
# 1. Base system deps (rarely change)
# 2. CLI tools (rarely change)
# 3. Node.js (might change version)
# 4. Playwright system deps (heavy, changes with playwright version)
# 5. VS Code tunnel CLI (changes occasionally)
# -----------------------------------------------------------------------------

# Base system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    git-lfs \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# CLI tools for agents
RUN apt-get update && apt-get install -y --no-install-recommends \
    ripgrep \
    jq \
    gh \
    universal-ctags \
    tree \
    inotify-tools \
    entr \
    fzf \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22.x LTS
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && node -v && npm -v

# Playwright system dependencies (cached in image layer)
RUN npx playwright@latest install-deps

# VS Code tunnel CLI
RUN set -eux; \
    tmpdir="$(mktemp -d)"; \
    curl -fsSL "https://update.code.visualstudio.com/latest/cli-linux-x64/stable" -o "$tmpdir/vscode-cli.tar.gz"; \
    tar -xzf "$tmpdir/vscode-cli.tar.gz" -C "$tmpdir"; \
    install -m 0755 "$tmpdir/code" /usr/local/bin/code-tunnel; \
    rm -rf "$tmpdir"

# Switch to dev user
USER vscode
ENV HOME=/home/vscode
ENV PATH="$HOME/.local/bin:$PATH"

WORKDIR /workspaces/ai-forecast-game
