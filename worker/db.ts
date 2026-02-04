import { nanoid } from 'nanoid';
import type { GameState, StoredGame, TurnResponse, VoteChoices, GameEvent } from '../src/types/game';
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

export async function createGame(
  db: Database,
  preset: string
): Promise<{ snapshot: string; state: GameState }> {
  const snapshot = generateSnapshotId();
  const state = createInitialState(preset, snapshot);

  const stored: Omit<StoredGame, 'created_at'> = {
    version: CURRENT_VERSION,
    snapshot,
    preset,
    state,
    ended_at: null,
    outcome: null,
  };

  await db
    .prepare(
      `INSERT INTO games (snapshot, version, preset, state, ended_at, outcome)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      snapshot,
      CURRENT_VERSION,
      preset,
      JSON.stringify(state),
      null,
      null
    )
    .run();

  return { snapshot, state };
}

export async function loadGame(
  db: Database,
  snapshot: string
): Promise<GameState | { error: string }> {
  const row = await db
    .prepare('SELECT version, state FROM games WHERE snapshot = ?')
    .bind(snapshot)
    .first<{ version: number; state: string }>();

  if (!row) {
    return { error: 'Game not found' };
  }

  if (row.version !== CURRENT_VERSION) {
    return { error: 'Game version outdated. Please start a new game.' };
  }

  try {
    const state = JSON.parse(row.state);
    return GameStateSchema.parse(state);
  } catch {
    return { error: 'Invalid game state' };
  }
}

export async function saveGameState(
  db: Database,
  newSnapshot: string,
  oldState: GameState,
  turnResponse: TurnResponse,
  choices: VoteChoices
): Promise<GameState> {
  // Build new events array
  const newEvents: GameEvent[] = [
    ...oldState.events,
    // Add the player's choices as an event
    { type: 'voteChoices' as const, choices },
    // Add the new news events
    ...turnResponse.events,
  ];

  // Add vote event if present
  if (turnResponse.vote) {
    newEvents.push({
      type: 'vote' as const,
      topics: turnResponse.vote.topics,
    });
  }

  // Add game over event if present
  if (turnResponse.gameOver) {
    newEvents.push({
      type: 'gameOver' as const,
      outcome: turnResponse.gameOver.outcome,
    });
  }

  // Calculate new date from the last news event
  const lastNewsEvent = [...turnResponse.events].reverse().find(e => e.type === 'news');
  const newDate = lastNewsEvent ? lastNewsEvent.date : oldState.date;

  const newState: GameState = {
    snapshot: newSnapshot,
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
      `INSERT INTO games (snapshot, version, preset, state, ended_at, outcome)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      newSnapshot,
      CURRENT_VERSION,
      oldState.preset,
      JSON.stringify(newState),
      endedAt,
      outcome
    )
    .run();

  return newState;
}
