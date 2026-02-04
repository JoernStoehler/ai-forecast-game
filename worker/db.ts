import { nanoid } from 'nanoid';
import type { GameState, TurnResponse, SummaryResponse, VoteChoices, GameEvent } from '../src/types/game';
import { CURRENT_VERSION, createInitialState, GameStateSchema } from '../src/types/game';

// Generate a 6-character alphanumeric snapshot ID
export function generateSnapshotId(): string {
  return nanoid(6);
}

export interface Database {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[] }>;
      run(): Promise<{ success: boolean }>;
    };
  };
}

// Snapshot status in DB
export type SnapshotStatus = 'reserved' | 'exists' | 'failed';

export interface LoadResult {
  status: SnapshotStatus;
  state: GameState | null;
}

// Create a new game (initial snapshot, needs /generate)
export async function createGame(
  db: Database,
  preset: string
): Promise<string> {
  const snapshot = generateSnapshotId();
  const state = createInitialState(preset, snapshot);

  await db
    .prepare(
      `INSERT INTO games (snapshot, version, preset, state, status)
       VALUES (?, ?, ?, ?, 'exists')`
    )
    .bind(snapshot, CURRENT_VERSION, preset, JSON.stringify(state))
    .run();

  return snapshot;
}

// Load a snapshot
export async function loadSnapshot(
  db: Database,
  snapshot: string
): Promise<LoadResult | null> {
  const row = await db
    .prepare('SELECT version, state, status FROM games WHERE snapshot = ?')
    .bind(snapshot)
    .first<{ version: number; state: string | null; status: SnapshotStatus }>();

  if (!row) {
    return null; // unknown
  }

  if (row.status === 'reserved') {
    return { status: 'reserved', state: null };
  }

  if (row.status === 'failed') {
    return { status: 'failed', state: null };
  }

  // status === 'exists'
  if (row.version !== CURRENT_VERSION) {
    return { status: 'failed', state: null }; // treat outdated as failed
  }

  try {
    const state = JSON.parse(row.state!);
    return { status: 'exists', state: GameStateSchema.parse(state) };
  } catch {
    return { status: 'failed', state: null };
  }
}

// Save player's turn (instant, creates complete snapshot)
export async function savePlayerTurn(
  db: Database,
  newSnapshot: string,
  oldState: GameState,
  choices: VoteChoices
): Promise<GameState> {
  const newEvents: GameEvent[] = [
    ...oldState.events,
    { type: 'voteChoices' as const, choices },
  ];

  const newState: GameState = {
    snapshot: newSnapshot,
    preset: oldState.preset,
    events: newEvents,
    phase: oldState.phase,
    date: oldState.date,
    isGameOver: false,
  };

  await db
    .prepare(
      `INSERT INTO games (snapshot, version, preset, state, status)
       VALUES (?, ?, ?, ?, 'exists')`
    )
    .bind(newSnapshot, CURRENT_VERSION, oldState.preset, JSON.stringify(newState))
    .run();

  return newState;
}

// Reserve a snapshot ID for LLM generation
export async function reserveSnapshot(
  db: Database,
  snapshot: string,
  preset: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO games (snapshot, version, preset, state, status)
       VALUES (?, ?, ?, NULL, 'reserved')`
    )
    .bind(snapshot, CURRENT_VERSION, preset)
    .run();
}

// Finalize LLM turn (news + vote or gameOver)
export async function finalizeLLMTurn(
  db: Database,
  snapshot: string,
  oldState: GameState,
  turnResponse: TurnResponse
): Promise<GameState> {
  const newEvents: GameEvent[] = [
    ...oldState.events,
    ...turnResponse.events,
  ];

  if (turnResponse.vote) {
    newEvents.push({
      type: 'vote' as const,
      topics: turnResponse.vote.topics,
    });
  }

  if (turnResponse.gameOver) {
    newEvents.push({
      type: 'gameOver' as const,
      outcome: turnResponse.gameOver.outcome,
    });
  }

  const lastNewsEvent = [...turnResponse.events].reverse().find(e => e.type === 'news');
  const newDate = lastNewsEvent ? lastNewsEvent.date : oldState.date;

  const newState: GameState = {
    snapshot,
    preset: oldState.preset,
    events: newEvents,
    phase: turnResponse.phase,
    date: newDate,
    isGameOver: !!turnResponse.gameOver,
  };

  const outcome = turnResponse.gameOver?.outcome ?? null;
  const endedAt = turnResponse.gameOver ? new Date().toISOString() : null;

  await db
    .prepare(
      `UPDATE games SET state = ?, status = 'exists', ended_at = ?, outcome = ?
       WHERE snapshot = ?`
    )
    .bind(JSON.stringify(newState), endedAt, outcome, snapshot)
    .run();

  return newState;
}

// Finalize summary generation
export async function finalizeSummary(
  db: Database,
  snapshot: string,
  oldState: GameState,
  summaryResponse: SummaryResponse
): Promise<GameState> {
  // Add summary to state (stored in a summary field, not as an event)
  const newState: GameState = {
    ...oldState,
    snapshot,
    summary: summaryResponse,
  };

  await db
    .prepare(
      `UPDATE games SET state = ?, status = 'exists'
       WHERE snapshot = ?`
    )
    .bind(JSON.stringify(newState), snapshot)
    .run();

  return newState;
}

// Mark snapshot as failed
export async function failSnapshot(
  db: Database,
  snapshot: string
): Promise<void> {
  await db
    .prepare(`UPDATE games SET status = 'failed' WHERE snapshot = ?`)
    .bind(snapshot)
    .run();
}

// Determine whose turn it is based on state
export type TurnType = 'llm' | 'player' | 'summary' | 'done';

export function getWhoseTurn(state: GameState): TurnType {
  if (state.events.length === 0) {
    return 'llm'; // Fresh game needs initial generation
  }

  // Check if we have a summary already
  if ('summary' in state && state.summary) {
    return 'done';
  }

  if (state.isGameOver) {
    return 'summary'; // Game over but no summary yet
  }

  const lastEvent = state.events[state.events.length - 1];

  if (lastEvent.type === 'voteChoices') {
    return 'llm';
  }

  if (lastEvent.type === 'vote') {
    return 'player';
  }

  // Shouldn't happen in normal flow
  return 'llm';
}
