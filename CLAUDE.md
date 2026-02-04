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
