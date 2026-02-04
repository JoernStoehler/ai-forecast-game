# Setup Status

## Smoke Test
```bash
npm ci && npm run build && npm test && npx playwright install && npm run test:e2e
```

## Ready
- devcontainer (node 22, playwright, puppeteer, cli tools)
- vite + react + typescript
- vitest + @testing-library/react
- playwright e2e
- gh cli (auth via mount)
- claude code (auth via mount)
- vscode tunnel (auth via mount)

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
