# M0: Planning & Design Decisions

(M1 = scaffold execution, separate session)

## Project Overview

**What is this app/game?**
A <15min web game exploring Jörn Stöhler's forecasting model of AI futures. Players experience a simulated trajectory from ~2025 to potential extinction (or survival), making policy decisions along the way. The goal is to surprise players with the forecasts, build intuition for how doom unfolds mundanely, and possibly inspire real-world engagement.

**Core user action:**
Player reads LLM-generated news/events as a timeline unfolds, then votes on policy proposals at decision points. One proposal can pass per normal vote; emergency votes require yes/no on urgent items.

**Emotional arc:**
"Boiling frog" — each step seems locally reasonable until suddenly you're dead. Player experiences same epistemic fog as real policymakers.

---

## Decisions Made

### Scenario Generation (P1)
- **LLM-generated scenarios** using Sonnet/GPT-5 tier models
- System prompt encodes Jörn's forecasting model
- Caching reduces costs (90% discount on cached input)
- Low player volume assumed; scaling is out of scope (follow-up project)

### Backend (P2)
- **Cloudflare Worker + D1/R2** for storing playthroughs
- Stores: pseudonym, preset parameters, scenario outcome, full narrative
- Enables shareable playthrough links
- Jörn handles wrangler API key setup

### Narrative Structure (P4)
- **Sequential reveal** — events unfold over time, player doesn't see full trajectory upfront
- "Boiling frog" effect is core to the experience
- Player can't tell they're in hard mode until too late

### Player Actions (Q5)
- LLM proposes **2-4 contextually plausible proposals** per vote phase
- Player picks **0-1 to pass** (rest go to defaults)
- **No freeform text input** — prevents players pushing out of scenario space
- Proposals evolve: new appear, old disappear, some persist, some get superseded

### Vote Structure (Q8)
- **Normal floor:** Multiple proposals, pick 0-1 (can be disabled some turns)
- **Emergency votes:** 0-3 urgent proposals requiring yes/no (no abstain/delay)
- Both can occur same turn
- Turn frequency tuned via playtesting

### Visible State (Q6)
- **No numerical progress bars** — capability measurement is unsolved IRL
- **News items** communicate state changes ("METR benchmark: AI matches experts on hour-long tasks")
- **Timeline** with year-month resolution (no days)
- **Current date** in title bar
- **Phase indicator** — LLM-assigned qualitative label ("early adoption" / "takeoff" / "arms race" / "global pause")
- Economic indicators visible but misleading (can't see secret compute allocation)

### Randomness & Replayability (Q7)
- **Hidden presets** rolled at game start
- LLM sees preset, player doesn't
- Presets encode model uncertainty:
  - ~5% ultra-fast takeoff (near-unwinnable)
  - ~2.5% high AI self-cooperation
  - ~2.5% high AI self-coordination
  - ~90% within 1-10yr range, varying difficulty
- **Post-game reveal:** preset name shown, enables comparison across players

### Comparison & Sharing
- **Compare to baseline:** show default trajectory vs player's outcome
- **Compare to friends:** Twitter sharing (Twitter IS the multiplayer infra)
- **Shareable links:** via Cloudflare backend

---

## Tech Stack

### Frontend
- TBD — likely simple SPA (React/Vue/Svelte or vanilla JS)
- Static hosting (Cloudflare Pages?)

### Backend
- Cloudflare Worker
- D1 (SQLite) or R2 (object storage) for playthrough data

### LLM
- Primary: Claude Sonnet or GPT-5 tier
- System prompt contains Jörn's forecasting model + gameplay parameters
- Prompt caching for cost efficiency

---

## Open Questions

### Q10: Game Scope
- Start date: 2025?
- End date: variable (extinction / stable outcome)?
- Target turns: ~10-20 decision points?
- IRL duration: <15min — how does that break down?

### Gameplay Parameter Tuning (deferred to playtesting)
- Proposals per vote phase
- Votes per game-year
- Event granularity between votes
- Balance of normal vs emergency votes

---

## Deferred to Later Milestones

### M3+ (if needed)
- **Fringeness/budget system** — measuring how far player pushes from plausible scenario space
- Only add if playtesting reveals players breaking the scenario bounds

### M5 (Release Features)
- Public hosting
- Social media features beyond basic Twitter sharing
- Leaderboards (if any)

### Out of Scope (Follow-up Project)
- Scaling for many players
- Infrastructure for high volume
- Monetization

---

## Core Loop Summary

```
1. Game starts, hidden preset rolled
2. LLM generates timeline events (news items)
3. LLM ends turn with vote event:
   - Normal floor: 2-4 proposals, pick 0-1
   - Emergency: 0-3 forced yes/no votes
4. Player votes
5. LLM generates next batch of events based on new state
6. Repeat until end condition (extinction / survival / time horizon)
7. Post-game: reveal preset, show outcome, compare to baseline, share on Twitter
```

---

## Next Steps for M1

1. Finalize Q10 (game scope/length)
2. Draft Jörn's forecasting model as LLM system prompt
3. Decide frontend framework
4. Scaffold basic project structure
5. Set up Cloudflare Worker + storage
