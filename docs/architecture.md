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
  summary: SummaryResponseSchema.optional(),  // Set after post-game generation
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

1. **Create game** — Roll preset, initialize state, return snapshot ID
2. **Load snapshot** — Return game state (or status if generating/failed)
3. **Submit vote** — Persist player choices (instant), return new snapshot ID
4. **Generate** — LLM generates next turn or summary, streams response, creates new snapshot

### Snapshot Status

Each snapshot in the database has a status:
- `reserved` — ID has been handed out, LLM generation is in progress
- `exists` — Complete snapshot with full game state
- `failed` — Generation failed, snapshot cannot be used

### Turn Types

The `getWhoseTurn()` function determines what action is valid:
- `llm` — Game needs LLM generation (empty events, or player just voted)
- `player` — Game is waiting for player vote (last event is a VoteEvent)
- `summary` — Game is over, needs summary generation
- `done` — Game is complete with summary

### Endpoints

```
POST /api/game/create
  Request: {}
  Response: { snapshot: string }
  // Creates initial game state with random preset
  // Snapshot is immediately usable (status: 'exists')

GET /api/game/:id
  Response varies by status:
    200 OK: { state: GameState }           // status: 'exists'
    202 Accepted: { status: 'generating' } // status: 'reserved'
    404 Not Found: { error: 'Unknown' }    // not in database
    410 Gone: { error: 'Failed' }          // status: 'failed'

POST /api/game/:id/submit
  Request: { choices: VoteChoices }  -- Zod-validated
  Response: { snapshot: string }
  // Instant operation - persists player choices in new snapshot
  // Returns 400 if not player's turn

POST /api/game/:id/generate
  Response: Streaming NDJSON
    - Each line is partial JSON as tokens arrive
    - Final shape: TurnResponse or SummaryResponse
  Headers:
    Content-Type: text/plain; charset=utf-8
    Transfer-Encoding: chunked
    X-Snapshot: abc456  -- New snapshot ID (reserved immediately)
  // Unified endpoint: handles both regular turns and summary generation
  // Determines which to run based on getWhoseTurn()
  // Returns 400 if not LLM's turn (or summary turn)
```

### Flow Diagram

```
New Game:
POST /create ─────► Creates snapshot A (status: exists, empty events)
         │
         ▼
POST /generate on A ─────► Returns X-Snapshot: B (status: reserved)
         │                 Streams LLM response
         │                 Finalizes B (status: exists) when done
         │
         ▼
URL updates to B
Player sees news + vote topics
```

```
Player Turn:
Player submits vote on snapshot B
         │
         ▼
POST /submit ─────► Creates snapshot C (status: exists)
         │          Player's choice persisted immediately
         │
         ▼
POST /generate on C ─────► Returns X-Snapshot: D (status: reserved)
         │                 Streams LLM response
         │                 Finalizes D (status: exists) when done
         │
         ▼
URL updates to D
Player sees new news + vote topics (or game over)
```

```
Post-Game Summary:
Game over on snapshot D (isGameOver: true)
         │
         ▼
POST /generate on D ─────► Returns X-Snapshot: E (status: reserved)
         │                 Streams SummaryResponse
         │                 Finalizes E (status: exists, has summary)
         │
         ▼
URL updates to E
Player sees summary tab
```

**Reconnection:** If frontend disconnects mid-stream:
1. Page reload → GET /:snapshot on D (reserved)
2. Response: 202 Accepted (status: generating)
3. Frontend polls until ready
4. When generation completes, snapshot becomes 'exists'

### Storage (D1)

```sql
CREATE TABLE games (
  snapshot TEXT PRIMARY KEY,     -- 6-char alphanumeric hash
  version INTEGER NOT NULL DEFAULT 1,
  preset TEXT NOT NULL,
  state JSON,                    -- NULL when status='reserved'
  status TEXT NOT NULL DEFAULT 'exists',  -- 'reserved', 'exists', 'failed'
  created_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  outcome TEXT  -- 'EXTINCTION' | 'UTOPIA' | NULL
);

CREATE INDEX idx_preset_outcome ON games(preset, outcome);
CREATE INDEX idx_created_at ON games(created_at);
CREATE INDEX idx_status ON games(status);
```

Note: Each operation creates a NEW snapshot (append-only). Old snapshots remain
accessible for sharing mid-game states. The `state` JSON contains the full
event log up to that point. When status='reserved', state is NULL (generation
in progress).

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

### Streaming Format (NDJSON with Vercel AI SDK `streamObject`)

**Full streaming flow:**
```
┌──────────┐         ┌──────────┐         ┌──────────┐
│ Frontend │ ◀─────▶ │  Worker  │ ◀─────▶ │   LLM    │
│          │         │          │         │ (Claude) │
│ generate │ NDJSON  │streamObj │ stream  │          │
│   API    │ ◀────── │  +pipe   │ ◀────── │          │
└──────────┘         └──────────┘         └──────────┘
     │                    │
     │                    │ X-Snapshot header (new ID)
     └────────────────────┘
```

- **Worker→LLM:** `streamObject()` calls LLM, streams response
- **Worker→Frontend:** Pipes partial objects as NDJSON (one JSON per line)
- Worker adds `X-Snapshot` header with the reserved snapshot ID
- **Frontend:** Parses NDJSON stream, updates UI with partial objects

**Pattern:** "Growing object" — the response is a single JSON object that builds up
as tokens stream in. Vercel AI SDK handles LLM streaming and Zod validation.

```typescript
// Worker side (simplified)
import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function streamTurnResponse(state: GameState, env: LLMEnv) {
  const prompt = buildPrompt(state);

  return streamObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: TurnResponseSchema,  // Zod schema
    prompt,
  });
}

// In request handler:
const streamResult = await streamTurnResponse(state, env);
const newSnapshot = generateSnapshotId();
await reserveSnapshot(db, newSnapshot, state.preset);

// Pipe partial objects as NDJSON
for await (const partial of streamResult.partialObjectStream) {
  writer.write(JSON.stringify(partial) + '\n');
}

// When complete, finalize snapshot
const fullResponse = await streamResult.object;
await finalizeLLMTurn(db, newSnapshot, state, fullResponse);
```

```typescript
// Client side (simplified)
export async function generate(
  sourceSnapshot: string,
  callbacks: {
    onPartial?: (partial: Partial<TurnResponse>) => void;
    onComplete: (response: TurnResponse | SummaryResponse) => void;
    onError: (error: Error) => void;
  }
): Promise<string> {
  const response = await fetch(`/api/game/${sourceSnapshot}/generate`, {
    method: 'POST',
  });

  const newSnapshot = response.headers.get('X-Snapshot')!;
  const reader = response.body!.getReader();

  // Parse NDJSON stream
  for await (const line of readLines(reader)) {
    const partial = JSON.parse(line);
    callbacks.onPartial?.(partial);
  }

  // Final object is the last partial
  callbacks.onComplete(lastPartial);
  return newSnapshot;
}
```

**Why NDJSON:**
- Works natively with Cloudflare Workers
- Simple to implement — just JSON.parse each line
- Allows partial UI updates as content streams in
- Vercel AI SDK handles LLM-side streaming

### Caching

- Gemini/Claude/OpenAI all support prompt caching
- First 3 sections (Rulebook + Preset + History) are cacheable
- ~90% cost reduction on cached tokens
- Cache persists for minutes to hours depending on provider

---

## Data Flow

### Create Game + Initial Generation

```
Browser                    Worker                     Storage       LLM API
   │                          │                          │              │
   │  POST /api/game/create   │                          │              │
   │─────────────────────────▶│                          │              │
   │                          │  Roll preset             │              │
   │                          │  Generate snapshot A     │              │
   │                          │  Create initial state    │              │
   │                          │                          │              │
   │                          │  INSERT game (exists)    │              │
   │                          │─────────────────────────▶│              │
   │                          │                          │              │
   │  { snapshot: "A" }       │                          │              │
   │◀─────────────────────────│                          │              │
   │                          │                          │              │
   │  POST /api/game/A/generate                          │              │
   │─────────────────────────▶│                          │              │
   │                          │  Reserve snapshot B      │              │
   │                          │─────────────────────────▶│              │
   │                          │                          │              │
   │  X-Snapshot: B           │  Stream request          │              │
   │  Stream: partial JSON    │─────────────────────────────────────────▶│
   │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│◀ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
   │                          │                          │              │
   │                          │  Finalize B (exists)     │              │
   │                          │─────────────────────────▶│              │
   │                          │                          │              │
   │  Navigate to /?snapshot=B                           │              │
```

### Player Vote + LLM Generation

```
Browser                    Worker                     Storage       LLM API
   │                          │                          │              │
   │  POST /api/game/B/submit │                          │              │
   │  { choices: {...} }      │                          │              │
   │─────────────────────────▶│                          │              │
   │                          │  Validate choices        │              │
   │                          │  Create snapshot C       │              │
   │                          │─────────────────────────▶│              │
   │                          │                          │              │
   │  { snapshot: "C" }       │                          │              │
   │◀─────────────────────────│                          │              │
   │                          │                          │              │
   │  POST /api/game/C/generate                          │              │
   │─────────────────────────▶│                          │              │
   │                          │  Reserve snapshot D      │              │
   │                          │─────────────────────────▶│              │
   │                          │                          │              │
   │  X-Snapshot: D           │  Stream request          │              │
   │  Stream: partial JSON    │─────────────────────────────────────────▶│
   │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│◀ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
   │                          │                          │              │
   │                          │  Finalize D (exists)     │              │
   │                          │─────────────────────────▶│              │
   │                          │                          │              │
   │  Navigate to /?snapshot=D                           │              │
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
