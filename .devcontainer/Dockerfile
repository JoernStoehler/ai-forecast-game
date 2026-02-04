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

# Browser dependencies for Playwright/Puppeteer
# These are the system libraries needed to run Chromium, Firefox, WebKit
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Chromium dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    # Firefox dependencies
    libgtk-3-0 \
    # WebKit dependencies
    libwoff1 \
    libharfbuzz-icu0 \
    libgstreamer-plugins-bad1.0-0 \
    libgstreamer-gl1.0-0 \
    libenchant-2-2 \
    libsecret-1-0 \
    libhyphen0 \
    libmanette-0.2-0 \
    # Shared
    xvfb \
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

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
