import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';

import { TurnResponseSchema, SummaryResponseSchema, type GameState, type VoteChoices } from '../src/types/game';
import { RULEBOOK } from '../src/prompts/rulebook';
import { getPreset } from '../src/prompts/presets';
import { PRE_2026_HISTORY } from '../src/prompts/history';
import { buildTurnSuffix, buildSummarySuffix } from '../src/prompts/suffix';

export interface LLMEnv {
  LLM_PROVIDER?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

type LLMProvider = 'anthropic' | 'google' | 'openai';

function getModel(env: LLMEnv) {
  const provider = (env.LLM_PROVIDER || 'anthropic') as LLMProvider;

  switch (provider) {
    case 'google':
      return google('gemini-2.0-flash');
    case 'openai':
      return openai('gpt-4o');
    case 'anthropic':
    default:
      return anthropic('claude-sonnet-4-20250514');
  }
}

function buildPrompt(state: GameState, choices: VoteChoices): string {
  const preset = getPreset(state.preset);
  const presetSection = preset
    ? `## Preset Configuration\n\n${preset.hidden}`
    : '';

  // Format event history for context
  const eventHistory = state.events
    .map((event, i) => {
      if (event.type === 'news') {
        const hidden = event.isHidden ? ' [HIDDEN]' : '';
        return `[${event.date.year}-${event.date.month}]${hidden} ${event.headline}${event.description ? ': ' + event.description : ''}`;
      }
      if (event.type === 'voteChoices') {
        return `[PLAYER CHOICE] ${Object.entries(event.choices).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
      }
      if (event.type === 'vote') {
        return `[TOPICS PRESENTED] ${event.topics.map(t => t.title).join(', ')}`;
      }
      if (event.type === 'gameOver') {
        return `[GAME OVER] ${event.outcome}`;
      }
      return `[Event ${i}]`;
    })
    .join('\n');

  return `${RULEBOOK}

${presetSection}

${PRE_2026_HISTORY}

## Game History So Far

${eventHistory || '(Game just started)'}

${buildTurnSuffix(state, choices)}`;
}

export async function streamTurnResponse(
  state: GameState,
  choices: VoteChoices,
  env: LLMEnv
) {
  const model = getModel(env);
  const prompt = buildPrompt(state, choices);

  const result = streamObject({
    model,
    schema: TurnResponseSchema,
    prompt,
  });

  return result;
}

export async function streamSummaryResponse(
  state: GameState,
  env: LLMEnv
) {
  const model = getModel(env);
  const preset = getPreset(state.preset);

  const eventHistory = state.events
    .map((event, i) => {
      if (event.type === 'news') {
        const hidden = event.isHidden ? ' [HIDDEN]' : '';
        return `[${i}] [${event.date.year}-${event.date.month}]${hidden} ${event.headline}`;
      }
      if (event.type === 'voteChoices') {
        return `[${i}] [PLAYER CHOICE] ${Object.entries(event.choices).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');

  const prompt = `${RULEBOOK}

## Preset: ${preset?.name || state.preset}

${preset?.description || ''}

## Full Game History (with event indices)

${eventHistory}

${buildSummarySuffix(state)}`;

  const result = streamObject({
    model,
    schema: SummaryResponseSchema,
    prompt,
  });

  return result;
}
