# AI Forecast Game — Agent Instructions

## Project Facts

**What this is:** A web game exploring AI futures through policy decisions. Players read LLM-generated news, vote on policy topics, see consequences, repeat. Goal: build intuition for how AI risk unfolds. Ends in EXTINCTION or UTOPIA.

**Tech stack:** React + TypeScript frontend (Vite), Cloudflare Worker backend (D1 database), LLM integration via Vercel AI SDK.

**Where things live:**
- `docs/*.md` — Specifications (these are requirements)
- `src/` — Frontend components, hooks, types, prompts
- `worker/` — Backend API, database, LLM integration
- `e2e/` — Playwright end-to-end tests

**Owner:** Jörn Stöhler — writes specs, approves spec changes, answers questions when blocked.

---

## Invariants

**Specs are authoritative:**
- `docs/*.md` files define what to build — implement to spec
- Do NOT modify specs without explicit approval from Jörn
- If a spec seems wrong or unclear, ask before changing it
- Don't "fix" specs to match what you built — fix code to match specs

**Definition of Done (before marking work complete):**
- Code compiles and passes lint
- Feature works end-to-end (not just "function exists")
- Can be demonstrated (manually or via test)
- `raise NotImplementedError` or `// TODO` stubs do NOT count as done

**No guessing:**
- Don't proceed with assumptions on ambiguous requirements

---

## Processes

### Verifying Changes

```bash
# Local devcontainer (first run: npm install && npx playwright install)
npm ci && npm run build && npm test && npm run test:e2e

# Claude Code web
npm run setup:ccweb && npm run build && npm test && npm run test:e2e
```

### Applying Database Migrations

After adding new migration files in `worker/migrations/`:
```bash
npx wrangler d1 migrations apply ai-forecast-game-db --remote
```

### Visual Development (Screenshots)

For UI work, capture and view screenshots:
```bash
npm run dev &
npx playwright screenshot http://localhost:5173 /tmp/screenshot.png
# Use Read tool to view the image
```

---

## Domain Facts

### Claude Code Web Environment

CC Web has pre-installed Playwright browsers but restricted network access:

- **Playwright pinned to v1.56.1** — do not upgrade or run `npx playwright install`
- **No external URLs** — browsers get `ERR_TUNNEL_CONNECTION_FAILED`; test deployments from your own browser
- **No .claude/ features** — skills, hooks, custom agents don't work; use CLI directly
