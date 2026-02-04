import { VoteRequestSchema, type TurnResponse, type SummaryResponse } from '../src/types/game';
import { getRandomPreset } from '../src/prompts/presets';
import {
  createGame,
  loadSnapshot,
  savePlayerTurn,
  reserveSnapshot,
  finalizeLLMTurn,
  finalizeSummary,
  failSnapshot,
  generateSnapshotId,
  getWhoseTurn,
  type Database,
} from './db';
import { streamTurnResponse, streamSummaryResponse, type LLMEnv } from './llm';

interface Env extends LLMEnv {
  DB: Database;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (url.pathname === '/api/health') {
        return jsonResponse({ status: 'ok' });
      }

      // POST /api/game/create - Create new game
      if (url.pathname === '/api/game/create' && request.method === 'POST') {
        const preset = getRandomPreset();
        const snapshot = await createGame(env.DB, preset.id);
        return jsonResponse({ snapshot });
      }

      // GET /api/game/:id - Load snapshot
      const loadMatch = url.pathname.match(/^\/api\/game\/([a-z0-9]+)$/i);
      if (loadMatch && request.method === 'GET') {
        const id = loadMatch[1];
        const result = await loadSnapshot(env.DB, id);

        if (!result) {
          return errorResponse('Unknown snapshot', 404);
        }

        if (result.status === 'reserved') {
          return jsonResponse({ status: 'generating' }, 202);
        }

        if (result.status === 'failed') {
          return errorResponse('Generation failed', 410);
        }

        // status === 'exists'
        return jsonResponse({ state: result.state });
      }

      // POST /api/game/:id/submit - Player submits vote
      const submitMatch = url.pathname.match(/^\/api\/game\/([a-z0-9]+)\/submit$/i);
      if (submitMatch && request.method === 'POST') {
        const id = submitMatch[1];

        const result = await loadSnapshot(env.DB, id);
        if (!result || result.status !== 'exists' || !result.state) {
          return errorResponse('Snapshot not found or not ready', 404);
        }

        const turn = getWhoseTurn(result.state);
        if (turn !== 'player') {
          return errorResponse(`Not player's turn (current: ${turn})`, 400);
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return errorResponse('Invalid JSON body');
        }

        const parseResult = VoteRequestSchema.safeParse(body);
        if (!parseResult.success) {
          return errorResponse(`Invalid submission: ${parseResult.error.message}`);
        }

        const newSnapshot = generateSnapshotId();
        await savePlayerTurn(env.DB, newSnapshot, result.state, parseResult.data.choices);

        return jsonResponse({ snapshot: newSnapshot });
      }

      // POST /api/game/:id/generate - LLM generates next step
      const generateMatch = url.pathname.match(/^\/api\/game\/([a-z0-9]+)\/generate$/i);
      if (generateMatch && request.method === 'POST') {
        const id = generateMatch[1];

        const result = await loadSnapshot(env.DB, id);
        if (!result || result.status !== 'exists' || !result.state) {
          return errorResponse('Snapshot not found or not ready', 404);
        }

        const turn = getWhoseTurn(result.state);
        if (turn !== 'llm' && turn !== 'summary') {
          return errorResponse(`Not LLM's turn (current: ${turn})`, 400);
        }

        // Reserve the new snapshot ID
        const newSnapshot = generateSnapshotId();
        await reserveSnapshot(env.DB, newSnapshot, result.state.preset);

        // Determine which generation to run
        const isSummary = turn === 'summary';

        // Start streaming
        const streamResult = isSummary
          ? await streamSummaryResponse(result.state, env)
          : await streamTurnResponse(result.state, {}, env);

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Process stream in background (doesn't stop if client disconnects)
        (async () => {
          try {
            for await (const partialObject of streamResult.partialObjectStream) {
              await writer.write(encoder.encode(JSON.stringify(partialObject) + '\n'));
            }

            const fullResponse = await streamResult.object;

            if (isSummary) {
              await finalizeSummary(env.DB, newSnapshot, result.state!, fullResponse as SummaryResponse);
            } else {
              await finalizeLLMTurn(env.DB, newSnapshot, result.state!, fullResponse as TurnResponse);
            }
          } catch (error) {
            console.error('Generation error:', error);
            await failSnapshot(env.DB, newSnapshot);
            await writer.write(encoder.encode(JSON.stringify({ error: 'Generation failed' }) + '\n'));
          } finally {
            await writer.close();
          }
        })();

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'X-Snapshot': newSnapshot,
            ...corsHeaders,
          },
        });
      }

      return errorResponse('Not found', 404);
    } catch (error) {
      console.error('Request error:', error);
      return errorResponse('Internal server error', 500);
    }
  },
};
