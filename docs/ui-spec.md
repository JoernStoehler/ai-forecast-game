# UI Specification

## Layout Overview

### Responsive Design

**Mobile (single column with tabs):**
```
┌─────────────────────────┐
│ [Date]                  │
│ Phase: [phase]    [New] │
├─────────────────────────┤
│ [Tab] [Tab] [Tab]       │
├─────────────────────────┤
│                         │
│  (tab content)          │
│                         │
└─────────────────────────┘
```

**Desktop (two columns):**
```
┌─────────────────────────────────────────────────┐
│ [Date]              Phase: [phase]        [New] │
├───────────────────────┬─────────────────────────┤
│                       │                         │
│   Left panel          │   Right panel           │
│   (News)              │   (Vote/Summary/etc)    │
│                       │                         │
└───────────────────────┴─────────────────────────┘
```

---

## Header

Constant across all states.

```
┌─────────────────────────────────────────────────┐
│ 2026-Mar              Phase: early adoption [New]│
└─────────────────────────────────────────────────┘
```

### Elements

| Element | Description |
|---------|-------------|
| Date | Year-month format (e.g., "2026-Mar"). Current game date. |
| Phase | LLM-assigned qualitative label. Changes throughout game. |
| [New] | Button to start new game. Top-right corner. |

### Phase Values

**During game:**
- "Tutorial" (landing page)
- "early adoption"
- "takeoff"
- "arms race"
- "global pause"
- (LLM can pick freely, these are examples)

**End states:**
- "EXTINCTION" (red text/background)
- "UTOPIA" (green text/background)

### [New] Button Behavior

| Current State | Behavior |
|---------------|----------|
| Tutorial tab | Hidden or disabled (no game to abandon) |
| Game in progress | Confirm modal: "Abandon current game?" |
| Post-game | Immediately starts new game (different preset guaranteed) |

---

## Tabs

Tabs shown/hidden based on game state.

| Tab | Landing | During Game | Post-Game | Shared Link |
|-----|---------|-------------|-----------|-------------|
| Tutorial | Visible | Hidden | Hidden | Hidden |
| News | Hidden | Visible | Visible | Visible |
| Vote | Hidden | Visible | Hidden | Hidden |
| Summary | Hidden | Hidden | Visible | Visible |

**Mobile:** Tabs shown as horizontal buttons below header.
**Desktop:** No tab buttons; panels shown side-by-side. (Tutorial = full width, Game = News left + Vote right, Post-game = News left + Summary right)

---

## Tutorial Tab (Landing Page)

Shown when visiting `/` without an active game.

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
├─────────────────────────────────────────────────┤  ← Fold line
│                                                 │
│  HOW TO PLAY                                    │
│                                                 │
│  • Read news events as they unfold              │
│  • Make policy decisions on key topics          │
│  • Try to delay or prevent extinction           │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  About Jörn Stöhler | Credits | Links           │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Above fold: hook + [Start Game] button
- Below fold: how to play + links (for scrollers)
- [Start Game] calls Worker, which returns `snapshot`, then redirect to `/?snapshot=abc123`

---

## News Tab (Timeline)

Scrollable list of news events.

### Structure

```
┌─────────────────────────────────────────────────┐
│ 2026                                            │  ← Year marker (large)
├─────────────────────────────────────────────────┤
│ Jan                                             │  ← Month marker (small)
│   METR benchmark: AI matches domain             │  ← Headline
│   experts on hour-long tasks.                   │  ← + Description (optional)
│                                                 │
│   Google stock up 12%.                          │  ← Headline only
├─────────────────────────────────────────────────┤
│ Feb                                             │
│   NVidia sells chips to China.                  │
│   China catches up to US AI compute             │
│   thanks to lifted export controls.             │
│   US market complains about doubling            │
│   chip prices.                                  │
├─────────────────────────────────────────────────┤
│ Apr                                             │  ← Mar skipped (empty)
│   ...                                           │
└─────────────────────────────────────────────────┘
```

### News Item Format

- **Headline only:** Short news (LLM decides)
- **Headline + description:** Longer news with detail (LLM decides)
- No collapsing — just scroll
- Skip empty months

### During LLM Turn (Loading States)

```
│ Mar                                             │
│   ●●● thinking...                               │  ← Before first item
└─────────────────────────────────────────────────┘

│ Mar                                             │
│   Google announces breakthrough...              │
│   ●●● typing...                                 │  ← Streaming in progress
└─────────────────────────────────────────────────┘
```

| Indicator | When |
|-----------|------|
| `●●● thinking...` | After Submit, before first content arrives |
| `●●● typing...` | Content streaming, more items coming |
| (none) | Player's turn (Vote floor active) |

### Post-Game Enhancements

After GameOver, News tab shows additional content:

- **Hidden events revealed** — marked visually (e.g., different color, icon)
- **LLM commentary** — annotations on key moments

```
│ Aug                                             │
│   🔓 China secretly begins ASI project.         │  ← Hidden event revealed
│   [Commentary: This was the turning point.      │  ← LLM annotation
│   With China racing ahead, global coordination  │
│   became nearly impossible.]                    │
└─────────────────────────────────────────────────┘
```

### Deferred (M4 Visual Polish)

- Sticky year/month headers while scrolling

---

## Vote Tab (Floor)

Topic-based multiple choice. Player picks one option per topic.

### Overall Structure

```
┌─────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ │  [Topic Card 1]                             │ │
│ │                                             │ │
│ │  [Topic Card 2]                             │ │  ← Scrollable area
│ │                                             │ │
│ │  [Topic Card 3]                             │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│                   [Submit]                      │  ← Fixed position
│         (disabled until all topics selected)    │
└─────────────────────────────────────────────────┘
```

### Topic Card

Each topic presents 2-4 mutually exclusive options. Player must select exactly one.

```
┌─────────────────────────────────────────────────┐
│  TOPIC: AI Compute Regulation                   │  ← Topic title
│  (optional description of context)              │  ← Topic description (optional)
│                                                 │
│  ○ Strict monitoring (1e24 FLOP threshold)      │  ← Option with description
│    Requires real-time reporting from all labs.  │
│                                                 │
│  ○ Moderate monitoring (1e26 FLOP threshold)    │  ← Option with description
│                                                 │
│  ○ Self-reporting only                          │  ← Option without description
│                                                 │
│  ○ No action                                    │  ← Option without description
│                                                 │
└─────────────────────────────────────────────────┘
```

### Selection Behavior

- **Standard radio buttons** — `<input type="radio">` per topic
- **No default selected** — Player must consciously choose
- **Can't unselect** — Once selected, can only switch to another option
- **Submit locked** — Until ALL topics have a selection

### Topic/Option Content

| Element | Required | Notes |
|---------|----------|-------|
| Topic title | Yes | e.g., "AI Compute Regulation" |
| Topic description | No | Context if needed |
| Option title | Yes | e.g., "Strict monitoring (1e24 FLOP)" |
| Option description | No | Explains implications if complex |

LLM decides when descriptions are needed:
- **Include** when: option is nuanced, context matters, consequences need preview
- **Omit** when: option is self-explanatory (e.g., "No action")

### Number of Topics/Options

- **Topics per turn:** 1-3 (LLM decides based on what's decision-worthy)
- **Options per topic:** 2-4 (including "No action" when plausible)
- **"No action" option:** Sometimes omitted if the topic demands a decision

### Example Turn

```
┌─────────────────────────────────────────────────┐
│  TOPIC: AI Compute Regulation                   │
│                                                 │
│  ○ Strict monitoring (1e24 FLOP threshold)      │
│  ● Moderate monitoring (1e26 FLOP threshold)    │  ← Selected
│  ○ Self-reporting only                          │
│  ○ No action                                    │
├─────────────────────────────────────────────────┤
│  TOPIC: International Response                  │
│  Following last month's UN summit...            │
│                                                 │
│  ○ Propose US-China inspection treaty           │
│  ○ Unilateral US restrictions                   │
│  ● Defer to next summit                         │  ← Selected
├─────────────────────────────────────────────────┤
│                   [Submit]                      │  ← Enabled (all topics selected)
└─────────────────────────────────────────────────┘
```

### Submit Button

| State | Appearance | Behavior |
|-------|------------|----------|
| Ready | Enabled | Sends VoteChoices to backend |
| Topics not complete | Disabled | All topics must have a selection |
| Submitting | Loading state | Shows "●●● thinking..." or similar |

### Deferred (M4 Visual Polish)

- Animated color transitions when state changes

---

## Summary Tab (Post-Game)

Shown after GameOver. Replaces Vote tab.

### Structure

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  WHAT HAPPENED                                  │
│                                                 │
│  In the end, Google's ASI project escaped       │
│  containment in August 2035. Despite your       │
│  efforts to regulate frontier labs early,       │
│  the economic pressure proved too strong.       │
│  When the breakthrough came, humanity had       │  ← Fluff explainer (prose)
│  mere hours before losing control entirely.     │     Self-sufficient
│                                                 │     Novel/interesting
│  Your aggressive early stance bought time,      │     Understandable for link-clickers
│  but the Slow Takeoff preset meant even         │
│  optimal play was unlikely to prevent           │
│  extinction entirely.                           │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  PRESET: Slow Takeoff                           │  ← Name
│                                                 │
│  A gradual capability curve with multiple       │  ← Description
│  intervention windows. More forgiving than      │
│  fast takeoff scenarios.                        │
│                                                 │
│  Other players with this preset:                │  ← Comparison (M5)
│  • Average extinction: 2032                     │
│  • Best run: 2041 (UTOPIA)                      │
│  • Your result: 2035 (top 30%)                  │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  STATS                                          │
│                                                 │
│  📅 Final date: 2035-Aug                        │  ← Always shown
│  📜 Decisions made: 24                          │
│  🛡️ Months of pause achieved: 14               │  ← LLM picks contextual extras
│  🏛️ International agreements: 2                │
│  ⚡ Compute ceiling reached: 10^26 FLOP        │
│                                                 │
└─────────────────────────────────────────────────┘
├─────────────────────────────────────────────────┤
│           [Share]         [New Game]            │  ← Fixed position
└─────────────────────────────────────────────────┘
```

### Stats

- LLM fills stats, but prompt specifies required ones (e.g., final date)
- LLM can add contextual/quirky stats based on playstyle
- Stats include icons (e.g., Lucide icons)

### Comparison Section

- Requires backend aggregation
- Defer actual data to M5
- Until then: skip section or show placeholder

### [Share] Button

Opens modal:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Human Extinction in 2035                       │
│  — Can you do better?                           │
│                                                 │
│  [game URL]                                     │
│                                                 │
│  [Copy to Clipboard]                            │
│                                                 │
│  [Twitter]  [Bluesky]  [...]                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Single share text (LLM generates one)
- Copy or direct share to platforms

### [New Game] Button

- Starts new game with guaranteed different preset
- Redirect to new `/?snapshot=xyz`

---

## Shared Link View

When visiting `/?snapshot=xyz` for a completed game:

- Same as post-game view (News + Summary)
- News tab shows full timeline with revealed secrets + commentary
- Summary tab shows full results
- Read-only (no Vote tab)
- [New Game] button visible → "Play Your Own"

---

## Loading States Summary

| Context | Indicator Location | Text |
|---------|-------------------|------|
| After Submit, before content | News feed | `●●● thinking...` |
| News streaming | News feed | `●●● typing...` |
| Vote object streaming | News feed | `●●● typing...` (proposing not detectable) |
| Post-game analysis | Summary tab | Loading spinner (20s acceptable) |

---

## Visual Cues

- **Glow effect** on unseen elements (new topics, first visit to tab)
- **Color coding:**
  - Gray = neutral
  - Green = positive/UTOPIA
  - Red = negative/EXTINCTION
- **Post-game revealed events:** Different color or icon (e.g., 🔓)
