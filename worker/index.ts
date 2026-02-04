import { VoteRequestSchema, type TurnResponse, type GameState } from '../src/types/game';
import { getRandomPreset } from '../src/prompts/presets';
import { createGame, loadGame, savePlayerTurn, saveLLMTurn, generateSnapshotId, type Database } from './db';
import { streamTurnResponse, streamSummaryResponse, type LLMEnv } from './llm';

interface Env extends LLMEnv {
  DB: Database;
}

// CORS headers for development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...headers,
    },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Determine snapshot status based on events
// 'awaiting_llm' = needs LLM generation (fresh game or has voteChoices as last event)
// 'complete' = has vote topics or is game over
function getSnapshotStatus(state: GameState): 'awaiting_llm' | 'complete' {
  if (state.isGameOver) return 'complete';
  if (state.events.length === 0) return 'awaiting_llm'; // Fresh game

  const lastEvent = state.events[state.events.length - 1];
  if (lastEvent.type === 'voteChoices') return 'awaiting_llm';
  if (lastEvent.type === 'vote') return 'complete';

  // News events without a following vote - shouldn't happen in normal flow
  return 'awaiting_llm';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route handling
    try {
      // Health check
      if (url.pathname === '/api/health') {
        return jsonResponse({ status: 'ok' });
      }

      // POST /api/game/create - Create new game
      // Returns snapshot in 'awaiting_llm' status (needs initial LLM generation)
      if (url.pathname === '/api/game/create' && request.method === 'POST') {
        const preset = getRandomPreset();
        const { snapshot, state } = await createGame(env.DB, preset.id);
        return jsonResponse({
          snapshot,
          state,
          status: 'awaiting_llm',
        });
      }

      // GET /api/game/:snapshot - Get game state
      // Returns state with status: 'awaiting_llm' | 'complete'
      const getGameMatch = url.pathname.match(/^\/api\/game\/([a-z0-9]+)$/i);
      if (getGameMatch && request.method === 'GET') {
        const snapshot = getGameMatch[1];
        const result = await loadGame(env.DB, snapshot);

        if ('error' in result) {
          return errorResponse(result.error, result.error === 'Game not found' ? 404 : 400);
        }

        return jsonResponse({
          state: result,
          status: getSnapshotStatus(result),
        });
      }

      // POST /api/game/:snapshot/turn - Submit player choices (instant)
      // Creates new snapshot with voteChoices applied, returns in 'awaiting_llm' status
      const turnMatch = url.pathname.match(/^\/api\/game\/([a-z0-9]+)\/turn$/i);
      if (turnMatch && request.method === 'POST') {
        const snapshot = turnMatch[1];

        const state = await loadGame(env.DB, snapshot);
        if ('error' in state) {
          return errorResponse(state.error, state.error === 'Game not found' ? 404 : 400);
        }

        if (state.isGameOver) {
          return errorResponse('Game is already over', 400);
        }

        // Ensure we're in 'complete' status (have vote topics to respond to)
        if (getSnapshotStatus(state) === 'awaiting_llm') {
          return errorResponse('Cannot submit turn: snapshot is awaiting LLM generation', 400);
        }

        // Parse and validate request body
        let body;
        try {
          body = await request.json();
        } catch {
          return errorResponse('Invalid JSON body');
        }

        const parseResult = VoteRequestSchema.safeParse(body);
        if (!parseResult.success) {
          return errorResponse(`Invalid vote choices: ${parseResult.error.message}`);
        }

        const { choices } = parseResult.data;

        // Create new snapshot with player's choices applied
        const newSnapshot = generateSnapshotId();
        const newState = await savePlayerTurn(env.DB, newSnapshot, state, choices);

        return jsonResponse({
          snapshot: newSnapshot,
          state: newState,
          status: 'awaiting_llm',
        });
      }

      // GET /api/game/:snapshot/stream - Stream LLM generation
      // Starts (or restarts) LLM generation for snapshots in 'awaiting_llm' status
      // Returns streaming response with X-New-Snapshot header at completion
      const streamMatch = url.pathname.match(/^\/api\/game\/([a-z0-9]+)\/stream$/i);
      if (streamMatch && request.method === 'GET') {
        const snapshot = streamMatch[1];

        const state = await loadGame(env.DB, snapshot);
        if ('error' in state) {
          return errorResponse(state.error, state.error === 'Game not found' ? 404 : 400);
        }

        if (getSnapshotStatus(state) !== 'awaiting_llm') {
          return errorResponse('Snapshot does not need LLM generation', 400);
        }

        // Extract the player's choices from the last event (if any)
        const lastEvent = state.events[state.events.length - 1];
        const choices = lastEvent?.type === 'voteChoices' ? lastEvent.choices : {};

        // Generate new snapshot ID for the result
        const newSnapshot = generateSnapshotId();

        // Stream LLM response
        const streamResult = await streamTurnResponse(state, choices, env);

        // Create a TransformStream to intercept the response
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Process the stream
        (async () => {
          try {
            for await (const partialObject of streamResult.partialObjectStream) {
              await writer.write(encoder.encode(JSON.stringify(partialObject) + '\n'));
            }

            // Get final object and save to DB
            const fullResponse: TurnResponse = await streamResult.object;
            await saveLLMTurn(env.DB, newSnapshot, state, fullResponse);
          } catch (error) {
            console.error('Stream error:', error);
            await writer.write(encoder.encode(JSON.stringify({ error: 'Stream error' }) + '\n'));
          } finally {
            await writer.close();
          }
        })();

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-New-Snapshot': newSnapshot,
            ...corsHeaders,
          },
        });
      }

      // GET /api/game/:snapshot/summary - Stream post-game summary
      const summaryMatch = url.pathname.match(/^\/api\/game\/([a-z0-9]+)\/summary$/i);
      if (summaryMatch && request.method === 'GET') {
        const snapshot = summaryMatch[1];

        const state = await loadGame(env.DB, snapshot);
        if ('error' in state) {
          return errorResponse(state.error, state.error === 'Game not found' ? 404 : 400);
        }

        if (!state.isGameOver) {
          return errorResponse('Game is not over yet', 400);
        }

        const streamResult = await streamSummaryResponse(state, env);

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        (async () => {
          try {
            for await (const partialObject of streamResult.partialObjectStream) {
              await writer.write(encoder.encode(JSON.stringify(partialObject) + '\n'));
            }
          } catch (error) {
            console.error('Stream error:', error);
            await writer.write(encoder.encode(JSON.stringify({ error: 'Stream error' }) + '\n'));
          } finally {
            await writer.close();
          }
        })();

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            ...corsHeaders,
          },
        });
      }

      // 404 for unmatched routes
      return errorResponse('Not found', 404);
    } catch (error) {
      console.error('Request error:', error);
      return errorResponse('Internal server error', 500);
    }
  },
};
