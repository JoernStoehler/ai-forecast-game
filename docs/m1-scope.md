# M1: Scaffold Scope

## Goal
Set up a working project structure that can render the UI and make LLM calls. No game logic polish yet — just the skeleton.

---

## Deliverables

### 1. Project Setup
- [x] Vite + React + TypeScript project
- [x] Vitest configured
- [x] ESLint / Prettier (standard config)
- [x] `.env.example` for API keys

### Dependencies (with rationale)

| Package | Purpose | Why this one |
|---------|---------|--------------|
| **react 18** | UI framework | Standard, stable API since 2022 |
| **vite 6** | Build tool | Fast, good DX, works with Cloudflare |
| **vitest** | Unit tests | Vite-native, drop-in Jest replacement |
| **playwright** | E2E tests | More reliable than Puppeteer, better CI support |
| **zod** | Schema validation | Most popular TS validation lib, great inference |
| **lucide-react** | Icons | Tree-shakeable, consistent with shadcn/ui |
| **nanoid** | ID generation | Standard, small, configurable alphabet |
| **ai** (Vercel AI SDK) | LLM client | Unified multi-provider, streaming built-in; fallback: manual fetch |

**LLM SDK strategy:**
1. Try `ai` (Vercel AI SDK) — handles streaming, works with Anthropic/OpenAI/Google
2. If Workers friction → fall back to manual fetch + Zod (parsing code in architecture.md)
3. Don't troubleshoot — if it doesn't work out of box, move on

**Not using:**
- Redux/Zustand — overkill for this scale, React context sufficient
- Tailwind — adds build complexity, plain CSS modules fine for M1
- tRPC — overkill, simple fetch + Zod validation enough

### 2. Cloudflare Setup
- [ ] Worker project in `/worker`
- [ ] `wrangler.toml` configured
- [ ] D1 database schema (snapshots table)
- [ ] Local dev with Miniflare

### 3. Frontend Components (Skeleton)

**Layout:**
- [ ] `Header` — date, phase, [New] button
- [ ] `TabBar` — Tutorial / News / Vote / Summary (show/hide logic)
- [ ] Responsive: tabs on mobile, side-by-side on desktop

**Tabs:**
- [ ] `TutorialTab` — landing page with game description + [Start Game]
- [ ] `NewsTab` — scrollable timeline with year/month markers
- [ ] `VoteTab` — topic cards with radio buttons + Submit
- [ ] `SummaryTab` — placeholder for post-game content

**Components:**
- [ ] `NewsItem` — headline + optional description
- [ ] `TopicCard` — title + options as radio buttons
- [ ] `SubmitButton` — disabled until all topics selected
- [ ] `LoadingIndicator` — thinking/typing states

### 4. State Management
- [ ] Game state type definitions
- [ ] Event types: `News`, `Vote`, `PhaseChange`, `GameOver`
- [ ] Append-only event log → React state reducer
- [ ] URL sync with `?snapshot=abc123`

### 5. Backend API (Worker)

**Endpoints:**
- [ ] `POST /api/game/create` — roll preset, return snapshot hash
- [ ] `GET /api/game/:snapshot` — return game state
- [ ] `POST /api/game/:snapshot/vote` — validate choices, call LLM, return new snapshot

**Storage:**
- [ ] D1 table: `games (snapshot TEXT PRIMARY KEY, preset TEXT, state JSON, created_at, ended_at, outcome)`
- [ ] Generate 6-char alphanumeric hash via nanoid

### 6. LLM Integration (Minimal)
- [ ] LLM client abstraction (Gemini / Claude / OpenAI switchable)
- [ ] Placeholder rulebook prompt
- [ ] Streaming response handling
- [ ] Parse LLM output to event types

### 7. Prompts (Placeholder)
```
/src/prompts/
  rulebook.ts      — placeholder game rules
  presets.ts       — 1-2 placeholder presets
  history.ts       — placeholder pre-2026 events
```

---

## NOT in M1 Scope

- Polished UI / styling (M4)
- Real game content (M2 — expert interviews)
- Post-game summary generation (M3)
- Share functionality (M5)
- Analytics, monitoring (M5+)

---

## Success Criteria

1. Can visit `/` and see Tutorial tab
2. Can click [Start Game] and get redirected to `/?snapshot=abc`
3. Can see placeholder news events stream in
4. Can see placeholder topics and select options
5. Can submit and see new events appear
6. State persists in D1 — can refresh and resume

---

## File Structure Target

```
/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── TabBar.tsx
│   │   ├── TutorialTab.tsx
│   │   ├── NewsTab/
│   │   │   ├── NewsTab.tsx
│   │   │   └── NewsItem.tsx
│   │   ├── VoteTab/
│   │   │   ├── VoteTab.tsx
│   │   │   └── TopicCard.tsx
│   │   └── SummaryTab.tsx
│   ├── hooks/
│   │   ├── useGameState.ts
│   │   └── useStream.ts
│   ├── types/
│   │   └── game.ts
│   ├── api/
│   │   └── client.ts
│   ├── prompts/
│   │   ├── rulebook.ts
│   │   ├── presets.ts
│   │   └── history.ts
│   ├── App.tsx
│   └── main.tsx
├── worker/
│   ├── index.ts
│   ├── llm.ts
│   └── db.ts
├── public/
├── docs/               (existing)
├── expert/             (created in M2)
├── package.json
├── vite.config.ts
├── wrangler.toml
└── .env.example
```

---

## M2 Preview

After M1, we have a working skeleton. M2 is:
1. Interview Jörn about forecasting model
2. Create `expert/*.md` files
3. Transform to real `src/prompts/*.ts`
4. Playtest with Task() subagent
5. Iterate on prompt quality
