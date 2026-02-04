import { z } from 'zod';

// === Date ===
export const DateSchema = z.object({
  year: z.number(),
  month: z.number().min(1).max(12),
});

// === Events ===
export const NewsEventSchema = z.object({
  type: z.literal('news'),
  date: DateSchema,
  headline: z.string(),
  description: z.string().optional(),
  isHidden: z.boolean().optional(), // Hidden until post-game reveal
});

export const TopicOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
});

export const TopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  options: z.array(TopicOptionSchema).min(2).max(4),
});

export const VoteEventSchema = z.object({
  type: z.literal('vote'),
  topics: z.array(TopicSchema).min(1).max(3),
});

export const VoteChoicesSchema = z.record(z.string(), z.string());
// Example: { "compute-regulation": "strict-monitoring", "intl-response": "defer" }

export const VoteChoicesEventSchema = z.object({
  type: z.literal('voteChoices'),
  choices: VoteChoicesSchema,
});

export const GameOverEventSchema = z.object({
  type: z.literal('gameOver'),
  outcome: z.enum(['EXTINCTION', 'UTOPIA']),
});

export const GameEventSchema = z.discriminatedUnion('type', [
  NewsEventSchema,
  VoteEventSchema,
  VoteChoicesEventSchema,
  GameOverEventSchema,
]);

// === Game State ===
export const GameStateSchema = z.object({
  snapshot: z.string().nullable(),
  preset: z.string(),
  events: z.array(GameEventSchema),
  phase: z.string(),
  date: DateSchema,
  isGameOver: z.boolean(),
});

// === Turn Response (from LLM) ===
export const TurnResponseSchema = z.object({
  events: z.array(NewsEventSchema),
  vote: VoteEventSchema.optional(),
  gameOver: z.object({
    outcome: z.enum(['EXTINCTION', 'UTOPIA']),
  }).optional(),
  phase: z.string(),
});

// === Summary Response (post-game) ===
export const SummaryStatSchema = z.object({
  icon: z.string(),
  label: z.string(),
  value: z.string(),
});

export const CommentarySchema = z.object({
  targetEventIndex: z.number(),
  comment: z.string(),
});

export const SummaryResponseSchema = z.object({
  whatHappened: z.string(),
  stats: z.array(SummaryStatSchema),
  commentary: z.array(CommentarySchema),
  shareText: z.string(),
});

// === API Request/Response Types ===
export const CreateGameResponseSchema = z.object({
  snapshot: z.string(),
});

export const GetGameResponseSchema = z.object({
  state: GameStateSchema,
});

export const VoteRequestSchema = z.object({
  choices: VoteChoicesSchema,
});

// === TypeScript Types ===
export type GameDate = z.infer<typeof DateSchema>;
export type NewsEvent = z.infer<typeof NewsEventSchema>;
export type TopicOption = z.infer<typeof TopicOptionSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type VoteEvent = z.infer<typeof VoteEventSchema>;
export type VoteChoices = z.infer<typeof VoteChoicesSchema>;
export type VoteChoicesEvent = z.infer<typeof VoteChoicesEventSchema>;
export type GameOverEvent = z.infer<typeof GameOverEventSchema>;
export type GameEvent = z.infer<typeof GameEventSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
export type TurnResponse = z.infer<typeof TurnResponseSchema>;
export type SummaryStat = z.infer<typeof SummaryStatSchema>;
export type Commentary = z.infer<typeof CommentarySchema>;
export type SummaryResponse = z.infer<typeof SummaryResponseSchema>;

// === UI State (extends GameState) ===
export interface UIState extends GameState {
  isLoading: boolean;
  loadingState: 'none' | 'thinking' | 'typing';
  currentVote: VoteEvent | null;
}

// === Storage Type ===
export interface StoredGame {
  version: number;
  snapshot: string;
  preset: string;
  state: GameState;
  created_at: string;
  ended_at: string | null;
  outcome: 'EXTINCTION' | 'UTOPIA' | null;
}

export const CURRENT_VERSION = 1;

// === Helper Functions ===
export function formatDate(date: GameDate): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.year}-${months[date.month - 1]}`;
}

export function createInitialState(preset: string, snapshot: string): GameState {
  return {
    snapshot,
    preset,
    events: [],
    phase: 'Tutorial',
    date: { year: 2026, month: 1 },
    isGameOver: false,
  };
}
