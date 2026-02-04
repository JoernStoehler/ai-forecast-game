import type { GameState, VoteChoices } from '../types/game';
import { formatDate } from '../types/game';

export function buildTurnSuffix(
  state: GameState,
  choices: VoteChoices
): string {
  const currentDate = formatDate(state.date);
  const choicesSummary = Object.entries(choices)
    .map(([topic, choice]) => `- ${topic}: ${choice}`)
    .join('\n');

  return `
## Current Turn

**Date:** ${currentDate}
**Phase:** ${state.phase}

**Player's Choices This Turn:**
${choicesSummary || '(No choices - game start)'}

**Instructions:**
1. Generate news events for the coming period (advance time 6-18 months)
2. Reflect the consequences of the player's choices in the news
3. Update the phase if appropriate
4. Either present new policy topics OR end the game

Remember:
- Include 2-5 news events
- Some events may be hidden (isHidden: true) for post-game reveal
- If presenting topics, include 1-3 topics with 2-4 options each
- End the game only when the narrative reaches a natural conclusion
`;
}

export function buildSummarySuffix(state: GameState): string {
  const finalDate = formatDate(state.date);
  const eventCount = state.events.filter(e => e.type === 'news').length;
  const voteCount = state.events.filter(e => e.type === 'voteChoices').length;

  return `
## Post-Game Summary Request

**Final Date:** ${finalDate}
**Total News Events:** ${eventCount}
**Decisions Made:** ${voteCount}
**Outcome:** ${state.isGameOver ? 'Game Over' : 'In Progress'}

**Instructions:**
Generate a post-game summary including:
1. "whatHappened" - A prose explanation of the key events and turning points (3-5 paragraphs)
2. "stats" - Relevant statistics with icons (Lucide icon names like "calendar", "scroll", "shield")
3. "commentary" - Annotations on 2-4 key moments (reference event indices)
4. "shareText" - A short, shareable summary for social media

The summary should:
- Explain why things unfolded as they did
- Reference specific player decisions and their consequences
- Reveal hidden events and explain their significance
- Be interesting enough that players want to share
`;
}

export default { buildTurnSuffix, buildSummarySuffix };
