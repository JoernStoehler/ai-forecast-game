# AI Forecast Game — Documentation

## What Is This?

A <15 minute web game exploring AI futures. Players experience a simulated trajectory from ~2026 to potential extinction (or survival), making policy decisions along the way.

**Core loop:** Read LLM-generated news → Vote on policy topics → See consequences → Repeat until game over.

**Goal:** Build intuition for how AI doom unfolds mundanely ("boiling frog" effect).

---

## Current Status

**Milestone:** M1 (Scaffold)
**Tracking:** See `m1-scope.md` for checkbox status

### Milestone Overview

| Milestone | Description | Status |
|-----------|-------------|--------|
| M0 | Planning & design | ✅ Complete |
| M1 | Scaffold (Vite + React + Worker + D1) | 🔄 In Progress |
| M2 | LLM prototyping with real content | Not started |
| M3 | Game logic polish | Not started |
| M4 | Visual polish | Not started |
| M5 | Release features (sharing, analytics) | Not started |
| M6 | Cleanup & QC | Not started |
| M7 | Announcement | Not started |

---

## Documentation Index

| File | Purpose | When to read |
|------|---------|--------------|
| `m0-planning.md` | Key decisions, game design | Understanding WHY |
| `m1-scope.md` | M1 deliverables with checkboxes | Implementing M1 |
| `architecture.md` | Technical details, types, streaming | Building backend/frontend |
| `ui-spec.md` | UI layout, components, states | Building components |
| `player-journey.md` | Full user experience flow | Understanding UX |
| `open-questions.md` | Resolved and pending decisions | Historical reference |

---

## Key Technical Decisions

- **Frontend:** React 18 + Vite + TypeScript
- **Backend:** Cloudflare Worker + D1 (SQLite)
- **LLM:** Vercel AI SDK (`streamObject`) with Anthropic/Google/OpenAI
- **Streaming:** Growing object pattern, ~10-20s per turn with visible progress
- **State:** Snapshot-based, URL = `/?snapshot=abc123`
- **Validation:** Zod schemas at API boundaries

---

## For New Agents

1. Read `../CLAUDE.md` for setup and project rules
2. Read this file for overview
3. Read `m1-scope.md` for current work (check the checkboxes!)
4. Read relevant spec files as needed
5. **Don't modify specs without Jörn's approval**
6. **Only check boxes when feature actually works end-to-end**
