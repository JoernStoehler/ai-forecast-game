# Setup Status

## Smoke Test

### Local devcontainer
First run: `npm install` (generates package-lock.json), then:
```bash
npm ci && npm run build && npm test && npx playwright install && npm run test:e2e
```

### Claude Code web
```bash
npm run setup:ccweb && npm run build && npm test && npm run test:e2e
```
Note: Playwright browsers are pre-installed on CC web (pinned to v1.56.1).

## Ready (local devcontainer)
- devcontainer (node 22, playwright, cli tools)
- vite + react + typescript
- vitest + @testing-library/react
- playwright e2e
- gh cli (auth via mount)
- claude code (auth via mount)
- vscode tunnel (auth via mount)

## Ready (Claude Code web)
- node 22, playwright 1.56.1 with browsers pre-installed
- vite + react + typescript
- vitest + @testing-library/react
- playwright e2e
- gh cli (installed via `npm run setup:ccweb`)

## Claude Code Web Limitations

**DO NOT** attempt to:
- Run `npx playwright install` (browser downloads blocked, storage.googleapis.com unreachable)
- Change @playwright/test version (must stay pinned to 1.56.1 to match pre-installed browsers)
- Use Playwright MCP (use CLI instead)
- Access external URLs from browser (blocked with ERR_TUNNEL_CONNECTION_FAILED)

**Visual development workflow** (screenshots of local dev server):
```bash
# Start dev server in background
npm run dev &

# Take screenshot (localhost works, external URLs don't)
npx playwright screenshot http://localhost:5173 /tmp/screenshot.png

# View screenshot with Read tool - Claude can see images
```

**Testing deployments**: Test from your own browser or local dev environment. CC web browsers cannot reach external URLs.

## Needs Setup
- wrangler
  - [ ] create .env from .env.example with CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
  - [ ] `wrangler d1 create ai-forecast-game-db` → copy database_id to wrangler.toml
  - [ ] configure subdomain in Cloudflare dashboard, update wrangler.toml routes
- ci/cd
  - [ ] add CLOUDFLARE_API_TOKEN to GitHub repo secrets
  - [ ] add CLOUDFLARE_ACCOUNT_ID to GitHub repo secrets
- d1 database
  - [ ] write migrations in migrations/
