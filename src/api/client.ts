import type { GameState, VoteChoices, TurnResponse, SummaryResponse } from '../types/game';
import { GameStateSchema, TurnResponseSchema, SummaryResponseSchema } from '../types/game';

const API_BASE = import.meta.env.DEV
  ? 'http://localhost:8787'
  : '';

export type SnapshotStatus = 'awaiting_llm' | 'complete';

export interface CreateGameResponse {
  snapshot: string;
  state: GameState;
  status: SnapshotStatus;
}

export interface LoadGameResponse {
  state: GameState;
  status: SnapshotStatus;
}

export interface SubmitTurnResponse {
  snapshot: string;
  state: GameState;
  status: 'awaiting_llm';
}

// POST /api/game/create - Create new game
export async function createGame(): Promise<CreateGameResponse> {
  const response = await fetch(`${API_BASE}/api/game/create`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create game');
  }

  const data = await response.json();
  return {
    snapshot: data.snapshot,
    state: GameStateSchema.parse(data.state),
    status: data.status,
  };
}

// GET /api/game/:snapshot - Load game state
export async function loadGame(snapshot: string): Promise<LoadGameResponse> {
  const response = await fetch(`${API_BASE}/api/game/${snapshot}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to load game');
  }

  const data = await response.json();
  return {
    state: GameStateSchema.parse(data.state),
    status: data.status,
  };
}

// POST /api/game/:snapshot/turn - Submit player choices (instant)
export async function submitTurn(
  snapshot: string,
  choices: VoteChoices
): Promise<SubmitTurnResponse> {
  const response = await fetch(`${API_BASE}/api/game/${snapshot}/turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ choices }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit turn');
  }

  const data = await response.json();
  return {
    snapshot: data.snapshot,
    state: GameStateSchema.parse(data.state),
    status: 'awaiting_llm',
  };
}

// Stream processing callbacks
export interface StreamCallbacks {
  onPartial: (partial: Partial<TurnResponse>) => void;
  onComplete: (response: TurnResponse, newSnapshot: string) => void;
  onError: (error: Error) => void;
}

// GET /api/game/:snapshot/stream - Stream LLM generation
export async function streamLLMGeneration(
  snapshot: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/game/${snapshot}/stream`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start stream');
  }

  const newSnapshot = response.headers.get('X-New-Snapshot');
  if (!newSnapshot) {
    throw new Error('Missing snapshot in response');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let lastValidResponse: TurnResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines (NDJSON)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const partial = JSON.parse(line);

          if (partial.error) {
            callbacks.onError(new Error(partial.error));
            return;
          }

          const parseResult = TurnResponseSchema.safeParse(partial);
          if (parseResult.success) {
            lastValidResponse = parseResult.data;
          }

          callbacks.onPartial(partial);
        } catch {
          // Ignore parse errors for partial objects
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        const partial = JSON.parse(buffer);
        const parseResult = TurnResponseSchema.safeParse(partial);
        if (parseResult.success) {
          lastValidResponse = parseResult.data;
        }
        callbacks.onPartial(partial);
      } catch {
        // Ignore
      }
    }

    if (lastValidResponse) {
      callbacks.onComplete(lastValidResponse, newSnapshot);
    } else {
      callbacks.onError(new Error('No valid response received'));
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error('Stream error'));
  }
}

// Summary stream callbacks
export interface SummaryStreamCallbacks {
  onPartial: (partial: Partial<SummaryResponse>) => void;
  onComplete: (response: SummaryResponse) => void;
  onError: (error: Error) => void;
}

// GET /api/game/:snapshot/summary - Stream post-game summary
export async function streamSummary(
  snapshot: string,
  callbacks: SummaryStreamCallbacks
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/game/${snapshot}/summary`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch summary');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let lastValidResponse: SummaryResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const partial = JSON.parse(line);

          if (partial.error) {
            callbacks.onError(new Error(partial.error));
            return;
          }

          const parseResult = SummaryResponseSchema.safeParse(partial);
          if (parseResult.success) {
            lastValidResponse = parseResult.data;
          }

          callbacks.onPartial(partial);
        } catch {
          // Ignore parse errors
        }
      }
    }

    if (buffer.trim()) {
      try {
        const partial = JSON.parse(buffer);
        const parseResult = SummaryResponseSchema.safeParse(partial);
        if (parseResult.success) {
          lastValidResponse = parseResult.data;
        }
        callbacks.onPartial(partial);
      } catch {
        // Ignore
      }
    }

    if (lastValidResponse) {
      callbacks.onComplete(lastValidResponse);
    } else {
      callbacks.onError(new Error('No valid summary received'));
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error('Stream error'));
  }
}
