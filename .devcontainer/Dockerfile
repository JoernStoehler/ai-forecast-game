FROM mcr.microsoft.com/devcontainers/base:ubuntu

ENV DEBIAN_FRONTEND=noninteractive

SHELL ["/bin/bash", "-lc"]

# -----------------------------------------------------------------------------
# Devcontainer image for ai-forecast-game
#
# Tech stack: React + Vite, Vitest, Cloudflare Pages/Workers
# Browser automation: Playwright, Puppeteer
#
# Design goals:
# - Node.js focused (no Python, Rust, LaTeX)
# - Full browser support for Playwright/Puppeteer
# - CLI tools useful for Claude Code agents
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


# Playwright system dependencies (cached in image layer)
# Run before Node.js install since this is heavy and rarely changes
RUN npx playwright@latest install-deps

# VS Code tunnel CLI (bake into image for faster postCreate)
RUN set -eux; \
    tmpdir="$(mktemp -d)"; \
    curl -fsSL "https://update.code.visualstudio.com/latest/cli-linux-x64/stable" -o "$tmpdir/vscode-cli.tar.gz"; \
    tar -xzf "$tmpdir/vscode-cli.tar.gz" -C "$tmpdir"; \
    install -m 0755 "$tmpdir/code" /usr/local/bin/code-tunnel; \
    rm -rf "$tmpdir"

# Node.js 22.x LTS
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && node -v && npm -v

# Switch to dev user
USER vscode
ENV HOME=/home/vscode
ENV PATH="$HOME/.local/bin:$PATH"

WORKDIR /workspaces/ai-forecast-game
