import { VoteRequestSchema, type TurnResponse } from '../src/types/game';
import { getRandomPreset } from '../src/prompts/presets';
import { createGame, loadGame, saveGameState, generateSnapshotId, type Database } from './db';
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
      if (url.pathname === '/api/game/create' && request.method === 'POST') {
        const preset = getRandomPreset();
        const { snapshot, state } = await createGame(env.DB, preset.id);
        return jsonResponse({ snapshot, state });
      }

      // GET /api/game/:snapshot - Get game state
      const getGameMatch = url.pathname.match(/^\/api\/game\/([a-z0-9]+)$/i);
      if (getGameMatch && request.method === 'GET') {
        const snapshot = getGameMatch[1];
        const result = await loadGame(env.DB, snapshot);

        if ('error' in result) {
          return errorResponse(result.error, result.error === 'Game not found' ? 404 : 400);
        }

        return jsonResponse({ state: result });
      }

      // POST /api/game/:snapshot/vote - Submit vote and get next turn
      const voteMatch = url.pathname.match(/^\/api\/game\/([a-z0-9]+)\/vote$/i);
      if (voteMatch && request.method === 'POST') {
        const snapshot = voteMatch[1];

        // Load game state
        const state = await loadGame(env.DB, snapshot);
        if ('error' in state) {
          return errorResponse(state.error, state.error === 'Game not found' ? 404 : 400);
        }

        if (state.isGameOver) {
          return errorResponse('Game is already over', 400);
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

        // Generate new snapshot ID for the result
        const newSnapshot = generateSnapshotId();

        // Stream LLM response
        const streamResult = await streamTurnResponse(state, choices, env);

        // Create a TransformStream to intercept the response
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Track the full response to save to DB
        let fullResponse: TurnResponse | null = null;

        // Process the stream
        (async () => {
          try {
            for await (const partialObject of streamResult.partialObjectStream) {
              // Write partial object to client
              await writer.write(encoder.encode(JSON.stringify(partialObject) + '\n'));
            }

            // Get final object and save to DB
            fullResponse = await streamResult.object;
            await saveGameState(env.DB, newSnapshot, state, fullResponse, choices);
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

      // GET /api/game/:snapshot/summary - Get post-game summary
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

        // Stream summary response
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
