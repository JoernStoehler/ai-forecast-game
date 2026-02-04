# Player Journey

Complete walkthrough of the player experience from discovery to sharing.

---

## 1. Discovery

### How players find the game

- **Twitter/X share:** Friend posts "Human Extinction in 2035 — Can you do better? [link]"
- **Bluesky share:** Same format
- **Direct link:** Word of mouth, blog post, AI researcher communities
- **Jörn's network:** AI researcher social media groups

### What they click

- Fresh link: `https://joernstoehler.com/`
- Shared game link: `https://joernstoehler.com/?id=a3x9k2`

---

## 2. Landing Page (Fresh Visitor)

**URL:** `https://joernstoehler.com/`

### What they see

```
┌─────────────────────────────────────────────────┐
│ 2026-Jan               Phase: Tutorial    [New] │
├─────────────────────────────────────────────────┤
│                                                 │
│              [GAME TITLE]                       │
│                                                 │
│     Can you prevent human extinction?           │
│                                                 │
│     Navigate AI policy decisions in             │
│     Jörn Stöhler's forecasting model            │
│     of the next decade.                         │
│                                                 │
│              [Start Game]                       │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  HOW TO PLAY                                    │
│  • Read news events as they unfold              │
│  • Vote on policy proposals                     │
│  • Try to delay or prevent extinction           │
│                                                 │
│  About | Credits                                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### What they do

1. Read the hook (above fold)
2. Optional: scroll to read "How to Play"
3. Click [Start Game]

---

## 3. Shared Link Landing

**URL:** `https://joernstoehler.com/?id=a3x9k2`

### Completed Game (friend's playthrough)

If the game at `id=a3x9k2` is finished:

```
┌─────────────────────────────────────────────────┐
│ 2035-Aug              Phase: EXTINCTION   [New] │
├─────────────────────────────────────────────────┤
│ [News] [Summary]                                │
├─────────────────────────────────────────────────┤
│                                                 │
│  (Summary tab content - friend's result)        │
│                                                 │
│  WHAT HAPPENED                                  │
│  ...                                            │
│                                                 │
│  PRESET: Slow Takeoff                           │
│  ...                                            │
│                                                 │
│  STATS                                          │
│  ...                                            │
│                                                 │
├─────────────────────────────────────────────────┤
│           [Share]         [Play Your Own]       │
└─────────────────────────────────────────────────┘
```

- Read-only view of friend's completed game
- Can browse News tab (with revealed secrets + commentary)
- [Play Your Own] starts a new game

### In-Progress Game (resume)

If the game at `id=a3x9k2` is still in progress:

- Player sees their saved game state
- News tab shows events so far
- Vote tab shows current proposals (if waiting for vote)
- Can continue playing

---

## 4. Game Start

### After clicking [Start Game]

1. Browser calls `POST /api/game/create`
2. Worker:
   - Rolls a hidden preset
   - Creates initial state with pre-2026 history
   - Generates 6-char ID
   - Stores in database
   - Returns `{ id: "a3x9k2" }`
3. Browser updates URL to `/?id=a3x9k2` (no page reload)
4. Tutorial tab hidden
5. News + Vote tabs appear

### Initial State

- News tab: Pre-2026 history events already populated
- Vote tab: Empty (waiting for first LLM turn)
- Header: `2026-Jan` / `Phase: early adoption`
- Loading indicator: `●●● thinking...` in news feed

### First LLM Turn

1. Worker calls LLM with initial prompt
2. LLM generates first batch of events (late 2025 / early 2026)
3. Events stream to browser, appear in News tab
4. LLM ends with Vote event
5. Vote tab populates with proposals
6. Player's turn begins

---

## 5. Gameplay Loop

### Player's Turn

**What they see:**

- News tab: Recent events (can scroll back to history)
- Vote tab: 2-4 proposals + 0-3 emergency items

**What they do:**

1. Read news to understand current situation
2. Switch to Vote tab (mobile) or look at right panel (desktop)
3. For each proposal:
   - Read title + description
   - Click [Pass], [Defer], or [Fail]
   - Card background changes color
4. For emergency items:
   - Must click [Pass] or [Fail] (no defer)
5. Click [Submit]

**Constraints:**

- Can pass 0-2 proposals per turn
- Can fail any number
- Defer is default (stays on floor)
- Submit disabled until all emergencies voted

### LLM's Turn

**What they see:**

1. Submit button shows loading state
2. News feed shows `●●● thinking...`
3. First news item appears → `●●● typing...`
4. More news items stream in
5. Vote event completes → Vote tab updates
6. Player's turn begins again

**Loading indicators:**

| Phase | Indicator | Location |
|-------|-----------|----------|
| Processing | `●●● thinking...` | News feed |
| Streaming | `●●● typing...` | News feed |
| Vote ready | (none) | Vote tab populated |

### Time Progression

- Each turn advances 1-6 months (LLM decides based on event density)
- Date in header updates
- Phase label may change ("early adoption" → "acceleration" → "takeoff")
- New proposals appear; old ones may disappear or persist

### Typical Turn Sequence

```
1. Player reads: "Google announces AGI benchmark achievement"
2. Player reads: "EU proposes AI liability framework"
3. Player votes: Pass "AI Liability Act", Fail "Compute Subsidy"
4. Player submits
5. LLM generates: 3 news events, new vote with 4 proposals
6. Player reads and votes
7. Repeat...
```

---

## 6. Game End

### GameOver Trigger

LLM decides when game ends based on:
- Extinction event (loss of control to ASI)
- Utopia achieved (human values secured)
- Time horizon reached (unlikely — most scenarios end in extinction)

### Transition

1. LLM outputs GameOver event with `phase: "EXTINCTION"` or `phase: "UTOPIA"`
2. Final news items describe the ending
3. Vote tab disappears
4. Summary tab appears
5. Header shows final date + end phase (red EXTINCTION or green UTOPIA)

### What Player Sees

```
┌─────────────────────────────────────────────────┐
│ 2035-Aug              Phase: EXTINCTION   [New] │
├─────────────────────────────────────────────────┤
│ [News] [Summary]                                │
├─────────────────────────────────────────────────┤
│                                                 │
│  (Loading spinner - generating analysis)        │
│                                                 │
└─────────────────────────────────────────────────┘
```

Then (after ~20s):

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  WHAT HAPPENED                                  │
│  In the end, Google's ASI project escaped...    │
│                                                 │
│  PRESET: Slow Takeoff                           │
│  A gradual capability curve with...             │
│  Other players: avg extinction 2032...          │
│                                                 │
│  STATS                                          │
│  📅 Final date: 2035-Aug                        │
│  📜 Proposals passed: 7                         │
│  ...                                            │
│                                                 │
├─────────────────────────────────────────────────┤
│           [Share]         [New Game]            │
└─────────────────────────────────────────────────┘
```

---

## 7. Post-Game Exploration

### Summary Tab

- Read "What Happened" prose explanation
- See preset reveal + comparison to other players
- Review stats (some always shown, some LLM-picked)

### News Tab (Enhanced)

After GameOver, News tab shows additional content:

- **Hidden events revealed:** Events that were happening secretly
  - Marked with 🔓 icon or different color
  - "🔓 China secretly begins ASI project (2028)"
- **LLM commentary:** Annotations on key moments
  - "This was the turning point..."
  - "Your decision here bought 6 months..."

### Reflection

Player can:
- Scroll through entire timeline
- Understand what they missed
- See how their decisions affected outcomes
- Compare their result to preset difficulty

---

## 8. Sharing

### Click [Share]

Modal appears:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Human Extinction in 2035                       │
│  — Can you do better?                           │
│                                                 │
│  https://joernstoehler.com/?id=a3x9k2           │
│                                                 │
│  [Copy to Clipboard]                            │
│                                                 │
│  [Twitter]  [Bluesky]                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Share Options

| Action | Result |
|--------|--------|
| [Copy to Clipboard] | URL copied, toast notification |
| [Twitter] | Opens Twitter compose with pre-filled text + URL |
| [Bluesky] | Opens Bluesky compose with pre-filled text + URL |

### Share Text

LLM generates one share text based on outcome. Example:

```
Human Extinction in 2035 — Can you do better?

I played Jörn Stöhler's AI futures game and reached
extinction in August 2035 (Slow Takeoff preset).

Try it yourself: https://joernstoehler.com/?id=a3x9k2
```

---

## 9. New Game

### Click [New Game]

1. Confirm modal if game in progress: "Abandon current game?"
2. Browser calls `POST /api/game/create`
3. Worker guarantees different preset than previous game
4. New ID generated
5. URL updates to `/?id=xyz789`
6. Fresh game begins

### Preset Rotation

- Worker tracks player's last preset (via cookie or localStorage)
- New game rolls from remaining presets
- Ensures variety across playthroughs

---

## 10. Return Visit

### Player bookmarked `/?id=a3x9k2`

- Game state persists on server
- Player sees exactly where they left off
- Can continue playing or start new game

### Player visits `/` again

- Landing page (Tutorial tab)
- No automatic resume
- Optional: localStorage stores last game ID
  - "Continue your game?" prompt
  - Or just show [Start Game] + [Continue: a3x9k2]

---

## 11. Social Loop

### Complete Loop

```
1. Alice plays → EXTINCTION 2035
2. Alice shares on Twitter
3. Bob sees tweet, clicks link
4. Bob sees Alice's completed game (read-only)
5. Bob clicks [Play Your Own]
6. Bob plays → EXTINCTION 2031
7. Bob shares: "I did worse than Alice!"
8. Carol sees Bob's tweet...
```

### Comparison Moments

- Seeing friend's result before playing (sets expectation)
- Seeing own result vs friend's
- Seeing own result vs average for same preset
- Discussing strategies ("I should have passed X earlier")

---

## Timing Estimates

| Phase | Duration |
|-------|----------|
| Landing → Start | 10-30 seconds |
| First LLM turn | 5-15 seconds |
| Per turn (read + vote) | 30-60 seconds |
| LLM turn (streaming) | 5-15 seconds |
| Typical game | 10-15 turns |
| Total play time | 10-15 minutes |
| Post-game analysis | 20 seconds loading + 2-5 min reading |
| Share flow | 30 seconds |

---

## Edge Cases

### Tab Closed Mid-Game

- Game state saved on server after each turn
- Player can return via bookmarked URL or browser history
- Resume exactly where they left off

### Network Error During LLM Turn

- Show error message
- [Retry] button to resend vote
- Game state not corrupted (vote not committed until LLM completes)

### Old Game Version

- Worker checks version on load
- If outdated: "This game uses an old version. Please start a new game."
- No data migration

### Shared Link to In-Progress Game

- Viewer sees current state
- If game belongs to someone else: read-only
- If game belongs to viewer (same browser): can continue
- (Implementation: no auth, so actually anyone could continue — acceptable for MVP)
