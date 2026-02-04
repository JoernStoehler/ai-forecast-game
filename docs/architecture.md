# Architecture

## System Overview

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────┐
│   Browser   │────▶│  Cloudflare Worker  │────▶│   LLM API   │
│   (React)   │◀────│  (Game Logic)       │◀────│  (Gemini/   │
│             │     │                     │     │   Claude/   │
│             │     │  ┌───────────────┐  │     │   GPT)      │
│             │     │  │  D1/R2        │  │     │             │
│             │     │  │  (Storage)    │  │     │             │
│             │     │  └───────────────┘  │     │             │
└─────────────┘     └─────────────────────┘     └─────────────┘
```

---

## Frontend (React + Vite)

### Stack

- **React 18+** with TypeScript
- **Vite** for build/dev
- **Vitest** for unit tests
- Hosted on **Cloudflare Pages**

### Project Structure

```
/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── TabBar.tsx
│   │   ├── NewsTab/
│   │   │   ├── NewsTab.tsx
│   │   │   ├── NewsItem.tsx
│   │   │   └── LoadingIndicator.tsx
│   │   ├── VoteTab/
│   │   │   ├── VoteTab.tsx
│   │   │   ├── TopicCard.tsx
│   │   │   └── SubmitButton.tsx
│   │   ├── SummaryTab/
│   │   │   ├── SummaryTab.tsx
│   │   │   ├── WhatHappened.tsx
│   │   │   ├── PresetReveal.tsx
│   │   │   ├── Stats.tsx
│   │   │   └── ShareModal.tsx
│   │   └── TutorialTab/
│   │       └── TutorialTab.tsx
│   ├── hooks/
│   │   ├── useGameState.ts
│   │   └── useStream.ts
│   ├── types/
│   │   └── game.ts
│   ├── api/
│   │   └── client.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── vitest.config.ts
```

### State Management

Simple React state + context. No Redux/Zustand needed for this scale.

### Type Definitions (Zod schemas at API boundaries)

```typescript
import { z } from 'zod';

// === Date ===
const DateSchema = z.object({
  year: z.number(),
  month: z.number().min(1).max(12),
});

// === Events ===
const NewsEventSchema = z.object({
  type: z.literal('news'),
  date: DateSchema,
  headline: z.string(),
  description: z.string().optional(),
  isHidden: z.boolean().optional(),  // Hidden until post-game reveal
});

const TopicOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
});

const TopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  options: z.array(TopicOptionSchema).min(2).max(4),
});

const VoteEventSchema = z.object({
  type: z.literal('vote'),
  topics: z.array(TopicSchema).min(1).max(3),
});

const VoteChoicesSchema = z.record(z.string(), z.string());
// Example: { "compute-regulation": "strict-monitoring", "intl-response": "defer" }

const VoteChoicesEventSchema = z.object({
  type: z.literal('voteChoices'),
  choices: VoteChoicesSchema,
});

const GameOverEventSchema = z.object({
  type: z.literal('gameOver'),
  outcome: z.enum(['EXTINCTION', 'UTOPIA']),
});

const GameEventSchema = z.discriminatedUnion('type', [
  NewsEventSchema,
  VoteEventSchema,
  VoteChoicesEventSchema,
  GameOverEventSchema,
]);

// === Game State ===
const GameStateSchema = z.object({
  snapshot: z.string().nullable(),
  preset: z.string(),
  events: z.array(GameEventSchema),
  phase: z.string(),
  date: DateSchema,
  isGameOver: z.boolean(),
});

// TypeScript types derived from Zod
type GameEvent = z.infer<typeof GameEventSchema>;
type NewsEvent = z.infer<typeof NewsEventSchema>;
type VoteEvent = z.infer<typeof VoteEventSchema>;
type VoteChoices = z.infer<typeof VoteChoicesSchema>;
type GameState = z.infer<typeof GameStateSchema>;
```

### Client-Side UI State (extends GameState)

```typescript
interface UIState extends GameState {
  isLoading: boolean;
  loadingState: 'none' | 'thinking' | 'typing';
  currentVote: VoteEvent | null;  // Extracted from last VoteEvent
}
```

### URL Handling

- `/?snapshot=abc123` — Load game state from Worker
- `/` — Show Tutorial tab (no game loaded)

No page reloads. React Router or simple `useEffect` on URL params.

---

## Backend (Cloudflare Worker)

### Responsibilities

1. **Create game** — Roll preset, initialize state, return ID
2. **Get state** — Return current game state for given ID
3. **Submit vote** — Validate VoteChoices, call LLM, update state
4. **Stream response** — Forward LLM streaming to client
5. **Aggregate stats** — Compute baseline comparisons (M5)

### Endpoints

```
POST /api/game/create
  Request: {}
  Response: { snapshot: string }

GET /api/game/:snapshot
  Response: { state: GameState }

POST /api/game/:snapshot/vote
  Request: { choices: VoteChoices }  -- Zod-validated
  Response: NDJSON stream
    - Multiple NewsEvent (some may have isHidden: true)
    - Final event: VoteEvent OR GameOverEvent
  Headers:
    Content-Type: application/x-ndjson
    Transfer-Encoding: chunked

GET /api/game/:snapshot/summary
  Response: { summary: SummaryData }
  (Called after GameOver for post-game analysis)
```

### Storage (D1)

```sql
CREATE TABLE games (
  snapshot TEXT PRIMARY KEY,     -- 6-char alphanumeric hash
  preset TEXT NOT NULL,
  state JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  outcome TEXT  -- 'EXTINCTION' | 'UTOPIA' | NULL
);

CREATE INDEX idx_preset_outcome ON games(preset, outcome);
```

Note: Each turn creates a NEW snapshot (append-only). Old snapshots remain
accessible for sharing mid-game states. The `state` JSON contains the full
event log up to that point.

### ID Format

- 6 characters alphanumeric: `a-z0-9`
- 36^6 = 2.1B combinations
- Tweet-friendly, human-typeable
- Example: `a3x9k2`

Generation: `nanoid` or random selection.

---

## LLM Integration

### Prompt Structure

```
┌─────────────────────────────────────────────────┐
│  RULEBOOK (constant)                            │
│  - Game rules                                   │
│  - Output format (JSON schema)                  │
│  - Gameplay parameters                          │
├─────────────────────────────────────────────────┤  CACHEABLE
│  PRESET (selected at game start)                │
│  - Hidden parameters                            │
│  - Scenario modifiers                           │
├─────────────────────────────────────────────────┤
│  PRE-2026 HISTORY (constant)                    │
│  - Background events                            │
│  - World state at game start                    │
├─────────────────────────────────────────────────┤
│  GAME EVENTS (grows each turn)                  │  PER-GAME
│  - Previous News, Votes, VoteChoices            │
├─────────────────────────────────────────────────┤
│  TURN SUFFIX (template)                         │  PER-TURN
│  - Current date                                 │
│  - Instructions for this turn                   │
└─────────────────────────────────────────────────┘
```

### TypeScript Constants

```typescript
// src/prompts/rulebook.ts
export const RULEBOOK = `
You are the game master for an AI futures simulation game...
[rules, output format, gameplay parameters]
`;

// src/prompts/presets.ts
export const PRESETS = {
  slowTakeoff: {
    name: "Slow Takeoff",
    description: "A gradual capability curve with multiple intervention windows.",
    hidden: `
      Capability growth rate: 1.5x per year
      Alignment difficulty: moderate
      ...
    `
  },
  fastTakeoff: {
    name: "Fast Takeoff",
    description: "Rapid capability gains with narrow intervention windows.",
    hidden: `
      Capability growth rate: 3x per year
      Alignment difficulty: high
      ...
    `
  },
  // ... more presets
};

// src/prompts/history.ts
export const PRE_2026_HISTORY = `
2023: ChatGPT reaches 100M users...
2024: Claude 3 and GPT-4 Turbo released...
2025: First AI-generated blockbuster film...
...
`;

// src/prompts/suffix.ts
export const turnSuffix = (date: string, isPostGame: boolean) => `
Current date: ${date}
${isPostGame ? 'Generate post-game summary...' : 'Generate next events...'}
`;
```

### LLM Output Format

LLM outputs JSON matching React component props:

```typescript
// Turn response
interface TurnResponse {
  events: Array<{
    type: 'news';
    date: { year: number; month: number };
    headline: string;
    description?: string;
    isHidden?: boolean;  // Revealed post-game
  }>;
  vote?: {
    topics: Array<{
      id: string;
      title: string;           // e.g., "AI Compute Regulation"
      description?: string;    // Optional context
      options: Array<{
        id: string;
        title: string;         // e.g., "Strict monitoring (1e24 FLOP threshold)"
        description?: string;  // Optional implications
      }>;
    }>;
  };
  gameOver?: {
    phase: 'EXTINCTION' | 'UTOPIA';
  };
  phase: string;  // Current phase label
}

// Post-game summary response (M3+)
interface SummaryResponse {
  whatHappened: string;  // Prose explanation
  stats: Array<{
    icon: string;  // Lucide icon name
    label: string;
    value: string;
  }>;
  // Hidden events are already in GameState.events with isHidden: true
  // Post-game, frontend reveals them in timeline
  commentary: Array<{
    targetEventIndex: number;  // Index into GameState.events
    comment: string;           // "This was the turning point..."
  }>;
  shareText: string;
}
```

### Streaming Format (NDJSON)

**Protocol:** Newline-Delimited JSON (NDJSON) over chunked HTTP response.

```
Content-Type: application/x-ndjson

{"type":"news","date":{"year":2026,"month":3},"headline":"..."}
{"type":"news","date":{"year":2026,"month":4},"headline":"..."}
{"type":"vote","topics":[...]}
```

**Rules:**
- Each line is one complete JSON object (GameEvent)
- Lines separated by `\n`
- Stream ends when response closes (no explicit terminator)
- Final event is always `vote` or `gameOver`
- Client validates each event with Zod before processing

**Why NDJSON over SSE:**
- Simpler parsing (split on newlines, parse each line)
- No event type prefixing needed
- Works with standard fetch streaming
- Better library support (e.g., `ndjson-parse`)

```typescript
// Client-side streaming handler (simplified)
async function* streamEvents(snapshot: string, choices: VoteChoices) {
  const response = await fetch(`/api/game/${snapshot}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ choices }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;  // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        const event = GameEventSchema.parse(JSON.parse(line));
        yield event;
      }
    }
  }
}
```

### Caching

- Gemini/Claude/OpenAI all support prompt caching
- First 3 sections (Rulebook + Preset + History) are cacheable
- ~90% cost reduction on cached tokens
- Cache persists for minutes to hours depending on provider

---

## Data Flow

### Create Game

```
Browser                    Worker                     Storage
   │                          │                          │
   │  POST /api/game/create   │                          │
   │─────────────────────────▶│                          │
   │                          │  Roll preset             │
   │                          │  Generate snapshot hash  │
   │                          │  Create initial state    │
   │                          │                          │
   │                          │  INSERT game             │
   │                          │─────────────────────────▶│
   │                          │                          │
   │  { snapshot: "abc123" }  │                          │
   │◀─────────────────────────│                          │
   │                          │                          │
   │  Navigate to /?snapshot=abc123                      │
```

### Game Turn

```
Browser                    Worker                     LLM API
   │                          │                          │
   │  POST /api/game/:snapshot/vote                      │
   │  { choices: {...} }      │                          │
   │─────────────────────────▶│                          │
   │                          │                          │
   │                          │  Validate choices        │
   │                          │  Build prompt            │
   │                          │                          │
   │                          │  Stream request          │
   │                          │─────────────────────────▶│
   │                          │                          │
   │                          │  Stream response         │
   │  SSE: NewsEvent          │◀ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
   │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                          │
   │                          │                          │
   │  SSE: NewsEvent          │◀ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
   │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                          │
   │                          │                          │
   │  SSE: VoteEvent          │◀ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
   │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                          │
   │                          │                          │
   │                          │  Update state in DB      │
   │                          │─────────────────────────▶│
```

---

## Version Handling

- Game state includes version number
- Worker refuses to load old version data (no migration)
- Simple: if version mismatch, return error, prompt new game

```typescript
interface StoredGame {
  version: number;  // Increment on breaking changes
  snapshot: string;
  preset: string;
  state: GameState;
  // ...
}

const CURRENT_VERSION = 1;

function loadGame(snapshot: string): GameState | Error {
  const stored = db.get(snapshot);
  if (stored.version !== CURRENT_VERSION) {
    return new Error('Game version outdated. Please start a new game.');
  }
  return stored.state;
}
```

---

## Testing Strategy

### Unit Tests (Vitest)

- Component rendering
- State transitions
- Event parsing

### E2E Tests (Agents)

- Task() subagent plays through game
- Playwright / Chrome MCP for browser automation
- Validates full loop: create → play → summary → share

### LLM Output Validation

- Schema validation on all LLM responses
- Fallback handling for malformed output
- Regression tests on key prompts

---

## Performance Considerations

### React

- Minimize re-renders (memo, useMemo)
- Virtualize long news lists if needed (unlikely for <15min game)
- Efficient state updates for streaming

### Network

- Streaming reduces perceived latency
- Prompt caching reduces LLM costs
- Short IDs for URL sharing

### Storage

- D1 is fast enough for this scale
- No need for Redis/caching layer
