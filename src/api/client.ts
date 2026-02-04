import type { GameState, VoteChoices, TurnResponse, SummaryResponse } from '../types/game';
import { GameStateSchema, TurnResponseSchema, SummaryResponseSchema } from '../types/game';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8787' : '';

// === Response types ===

export type LoadResult =
  | { status: 'exists'; state: GameState }
  | { status: 'generating' }
  | { status: 'unknown' }
  | { status: 'failed' };

// === API functions ===

// POST /api/game/create
export async function createGame(): Promise<string> {
  const response = await fetch(`${API_BASE}/api/game/create`, { method: 'POST' });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create game');
  }

  const data = await response.json();
  return data.snapshot;
}

// GET /api/game/:id
export async function loadSnapshot(id: string): Promise<LoadResult> {
  const response = await fetch(`${API_BASE}/api/game/${id}`);

  if (response.status === 404) {
    return { status: 'unknown' };
  }

  if (response.status === 202) {
    return { status: 'generating' };
  }

  if (response.status === 410) {
    return { status: 'failed' };
  }

  if (!response.ok) {
    throw new Error('Failed to load snapshot');
  }

  const data = await response.json();
  return { status: 'exists', state: GameStateSchema.parse(data.state) };
}

// POST /api/game/:id/submit
export async function submitVote(id: string, choices: VoteChoices): Promise<string> {
  const response = await fetch(`${API_BASE}/api/game/${id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ choices }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit vote');
  }

  const data = await response.json();
  return data.snapshot;
}

// === Streaming ===

export interface GenerateCallbacks {
  onPartial: (partial: Partial<TurnResponse | SummaryResponse>) => void;
  onComplete: (response: TurnResponse | SummaryResponse) => void;
  onError: (error: Error) => void;
}

// POST /api/game/:id/generate
export async function generate(
  id: string,
  callbacks: GenerateCallbacks
): Promise<string> {
  const response = await fetch(`${API_BASE}/api/game/${id}/generate`, { method: 'POST' });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start generation');
  }

  const newSnapshot = response.headers.get('X-Snapshot');
  if (!newSnapshot) {
    throw new Error('Missing snapshot in response');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let lastValidResponse: TurnResponse | SummaryResponse | null = null;

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
            return newSnapshot;
          }

          // Try to validate as TurnResponse or SummaryResponse
          const turnResult = TurnResponseSchema.safeParse(partial);
          if (turnResult.success) {
            lastValidResponse = turnResult.data;
          } else {
            const summaryResult = SummaryResponseSchema.safeParse(partial);
            if (summaryResult.success) {
              lastValidResponse = summaryResult.data;
            }
          }

          callbacks.onPartial(partial);
        } catch {
          // Ignore parse errors for partial objects
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const partial = JSON.parse(buffer);
        const turnResult = TurnResponseSchema.safeParse(partial);
        if (turnResult.success) {
          lastValidResponse = turnResult.data;
        } else {
          const summaryResult = SummaryResponseSchema.safeParse(partial);
          if (summaryResult.success) {
            lastValidResponse = summaryResult.data;
          }
        }
        callbacks.onPartial(partial);
      } catch {
        // Ignore
      }
    }

    if (lastValidResponse) {
      callbacks.onComplete(lastValidResponse);
    } else {
      callbacks.onError(new Error('No valid response received'));
    }
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error('Stream error'));
  }

  return newSnapshot;
}

// Poll for snapshot until it exists
export async function pollUntilReady(
  id: string,
  maxAttempts = 60,
  intervalMs = 1000
): Promise<GameState> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await loadSnapshot(id);

    if (result.status === 'exists') {
      return result.state;
    }

    if (result.status === 'failed') {
      throw new Error('Generation failed');
    }

    if (result.status === 'unknown') {
      throw new Error('Unknown snapshot');
    }

    // status === 'generating', wait and retry
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Timeout waiting for snapshot');
}
