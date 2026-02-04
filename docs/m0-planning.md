# M0: Planning & Design Decisions

## Document Index

- **m0-planning.md** (this file) — Overview, milestones, key decisions
- **ui-spec.md** — Detailed UI layout, components, interactions
- **architecture.md** — Technical architecture, data flow, LLM integration
- **player-journey.md** — Full player experience from discovery to sharing

---

## Project Overview

**What is this app/game?**
A <15min web game exploring Jörn Stöhler's forecasting model of AI futures. Players experience a simulated trajectory from ~2025 to potential extinction (or survival), making policy decisions along the way.

**Goals:**
- Surprise players with forecasts they didn't expect
- Build intuition for how doom unfolds mundanely ("boiling frog")
- Possibly inspire real-world engagement or "fighting spirit"
- NOT satire — the model is serious, the fun comes from interactivity

**Core user action:**
Player reads LLM-generated news/events as a timeline unfolds, then votes on policy proposals at decision points.

**Emotional arc:**
"Boiling frog" — each step seems locally reasonable until suddenly you're dead. Player experiences the same epistemic fog as real policymakers.

---

## Milestones

| Milestone | Description |
|-----------|-------------|
| **M0** | Planning & design (this session) |
| **M1** | Scaffold execution — Vite + React + Cloudflare Worker |
| **M2** | Prototype rules with LLM (Task() subagent or real API) |
| **M3** | Game logic polish |
| **M4** | Visual polish |
| **M5** | Release features (hosting, sharing, social) |
| **M6** | Cleanup & QC |
| **M7** | Announcement & maintenance |

**Out of scope (follow-up project):**
- Scaling for many players
- Infrastructure for high volume
- Monetization

---

## Key Design Decisions

### Scenario Generation
- **LLM-generated scenarios** using Sonnet/GPT-5 tier (or Gemini 3.0 Flash/Pro with free tier)
- System prompt encodes Jörn's forecasting model + gameplay rules
- Prompt structure: `[Rulebook] + [Preset] + [Pre-2026 History]` (cacheable) + `[Game Events]` + `[Suffix]`
- Prompts stored as TypeScript constants (not loaded files) — KISS
- Caching reduces costs (90% discount on cached input)
- Low player volume assumed; scaling is out of scope

### Narrative Structure
- **Sequential reveal** — events unfold over time, player doesn't see full trajectory
- "Boiling frog" effect is core to the experience
- Player can't tell they're in hard mode until too late

### Hidden Presets (Randomness & Replayability)
- Hidden preset rolled at game start
- LLM sees preset, player doesn't
- Presets encode model uncertainty:
  - ~5% ultra-fast takeoff (near-unwinnable)
  - ~2.5% high AI self-cooperation
  - ~2.5% high AI self-coordination
  - ~90% within 1-10yr range, varying difficulty
- Post-game: preset name + description revealed, enables comparison
- Presets have name + description (what makes it different from others)

### Player Actions
- LLM proposes **2-4 contextually plausible proposals** per vote phase
- Player picks **0-2 to pass**, can **fail** any (removes from floor for a while)
- **Defer** is default (proposal stays on floor)
- **No freeform text input** — prevents players pushing out of scenario space
- Proposals evolve: new appear, old disappear, some persist, some get superseded

### Vote Structure
- **Normal floor:** Multiple proposals, pick 0-2 to pass, fail any, defer rest
- **Emergency votes:** 0-3 urgent proposals requiring yes/no (no defer allowed)
- Emergency items at bottom of vote list
- Submit button fixed at bottom (disabled until all emergencies voted)

### Visible State
- **No numerical progress bars** — capability measurement is unsolved IRL
- **News items** communicate state changes (headline or headline + description)
- **Timeline** with year-month resolution (no days)
- **Current date** in header
- **Phase indicator** — LLM-assigned qualitative label
  - During game: "early adoption", "takeoff", "arms race", "global pause", etc.
  - End states: EXTINCTION (red), UTOPIA (green)
- Economic indicators visible in news but misleading (can't see secret compute allocation)

### Game Events (Data Model)
Append-only list of events, reduced to React state:
- **News** — appears in timeline
- **Vote** — ends LLM turn, shows proposals on floor
- **VoteChoices** — player's selections, sent to backend
- **GameOver** — triggers end state, reveals summary

### End States
- **EXTINCTION** — Loss of control to ASI that doesn't share human goals
- **UTOPIA** — Human morality shapes the lightcone
- (Other outcomes like RESCUE/TORTURE collapse into EXTINCTION — unknowable distinction)

---

## Tech Stack

### Frontend
- **React + TypeScript + Vite**
- **Vitest** for unit tests
- Static hosting on Cloudflare Pages
- Fully reactive SPA (no page reloads)

### Backend
- **Cloudflare Worker** handles:
  - LLM API calls (hides API keys)
  - Game state persistence
  - Save/load via short ID
  - Aggregate results for baseline comparisons
- **D1** (SQLite) or **R2** (object storage) for playthrough data
- Domain: joernstoehler.com

### LLM
- Primary: Gemini 3.0 Flash/Pro (free tier), Claude Sonnet, or GPT-5
- LLM outputs JSON matching React component props
- Streaming responses for reduced perceived latency
- Prompt caching for cost efficiency

### URL Structure
- `/?id=xyz` — game state (current or completed)
- `/?id=xyz&dark=1` — optional dark mode
- `/` — landing/tutorial page

---

## Gameplay Parameters (Tune via Playtesting)

- Proposals per vote phase (2-4)
- Pass limit per turn (1-2)
- Votes per game-year
- Event granularity between votes
- Balance of normal vs emergency votes
- Game length (~10-20 decision points for <15min)

---

## Deferred Features

### M3+ (if needed)
- **Fringeness/budget system** — measuring how far player pushes from plausible scenario space
- Only add if playtesting reveals players breaking scenario bounds

### M4 (Visual Polish)
- Sticky year/month headers on scroll
- Animated color transitions for vote cards
- Glow effects on unseen elements

### M5 (Release Features)
- Aggregate player comparison ("Other players with this preset averaged...")
- Additional social platforms beyond Twitter
- About/credits page content

---

## Open Questions for Future Sessions

- Exact preset definitions (names, parameters, descriptions)
- Rulebook prompt content (Jörn's forecasting model)
- Pre-2026 history content
- Fine-tuning game balance via playtesting
- Specific social share text format

---

## Core Loop Summary

```
1. Player visits / → sees Tutorial tab
2. Clicks [Start Game] → Worker creates (id, state)
3. Redirect to /?id=xyz → News + Vote tabs visible
4. LLM generates timeline events (news items) with streaming
5. LLM ends turn with Vote event (proposals on floor)
6. Player votes: Pass (0-2), Fail (any), Defer (rest)
7. Player clicks Submit → VoteChoices sent to backend
8. Repeat steps 4-7 until GameOver
9. Vote tab hidden, Summary tab appears
10. News tab shows hidden events + commentary
11. Player reads Summary, shares URL, clicks [New Game]
```
