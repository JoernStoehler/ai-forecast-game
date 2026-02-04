import { useState, useCallback, useEffect } from 'react';
import type { GameState, UIState, VoteEvent, VoteChoices, TurnResponse, SummaryResponse, GameEvent } from '../types/game';
import { createGame, loadGame, submitTurn, streamLLMGeneration, streamSummary, type SnapshotStatus } from '../api/client';

function getSnapshotFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('snapshot');
}

function setSnapshotInUrl(snapshot: string | null) {
  const url = new URL(window.location.href);
  if (snapshot) {
    url.searchParams.set('snapshot', snapshot);
  } else {
    url.searchParams.delete('snapshot');
  }
  window.history.pushState({}, '', url.toString());
}

function extractCurrentVote(events: GameEvent[]): VoteEvent | null {
  // Find the last vote event
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.type === 'vote') {
      return event;
    }
    // If we hit a voteChoices event, the previous vote has been answered
    if (event.type === 'voteChoices') {
      return null;
    }
  }
  return null;
}

const initialState: UIState = {
  snapshot: null,
  preset: '',
  events: [],
  phase: 'Tutorial',
  date: { year: 2026, month: 1 },
  isGameOver: false,
  isLoading: false,
  loadingState: 'none',
  currentVote: null,
};

export function useGameState() {
  const [state, setState] = useState<UIState>(initialState);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start LLM generation for a snapshot in 'awaiting_llm' status
  const startLLMGeneration = useCallback(async (snapshot: string, baseState: GameState) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      loadingState: 'thinking',
    }));

    try {
      await streamLLMGeneration(snapshot, {
        onPartial: (partial) => {
          if (partial.events && partial.events.length > 0) {
            setState(prev => ({
              ...prev,
              loadingState: 'typing',
            }));
          }
        },
        onComplete: (response: TurnResponse, newSnapshot: string) => {
          setSnapshotInUrl(newSnapshot);

          const newEvents: GameEvent[] = [
            ...baseState.events,
            ...response.events,
          ];

          if (response.vote) {
            newEvents.push({
              type: 'vote' as const,
              topics: response.vote.topics,
            });
          }

          if (response.gameOver) {
            newEvents.push({
              type: 'gameOver' as const,
              outcome: response.gameOver.outcome,
            });
          }

          setState(prev => ({
            ...prev,
            snapshot: newSnapshot,
            events: newEvents,
            phase: response.gameOver ? response.gameOver.outcome : response.phase,
            date: response.events.length > 0
              ? response.events[response.events.length - 1].date
              : prev.date,
            isGameOver: !!response.gameOver,
            isLoading: false,
            loadingState: 'none',
            currentVote: response.vote ? { type: 'vote', topics: response.vote.topics } : null,
          }));
        },
        onError: (err) => {
          setError(err.message);
          setState(prev => ({ ...prev, isLoading: false, loadingState: 'none' }));
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
      setState(prev => ({ ...prev, isLoading: false, loadingState: 'none' }));
    }
  }, []);

  // Load game from URL on mount
  useEffect(() => {
    const snapshot = getSnapshotFromUrl();
    if (snapshot) {
      setState(prev => ({ ...prev, isLoading: true }));
      loadGame(snapshot)
        .then(({ state: gameState, status }) => {
          setState({
            ...gameState,
            isLoading: status === 'awaiting_llm',
            loadingState: status === 'awaiting_llm' ? 'thinking' : 'none',
            currentVote: extractCurrentVote(gameState.events),
          });

          // If snapshot is awaiting LLM, start generation
          if (status === 'awaiting_llm') {
            startLLMGeneration(snapshot, gameState);
          }
        })
        .catch(err => {
          setError(err.message);
          setState(prev => ({ ...prev, isLoading: false }));
        });
    }
  }, [startLLMGeneration]);

  // Start a new game
  const startGame = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    setError(null);
    setSummary(null);

    try {
      const { snapshot, state: gameState, status } = await createGame();
      setSnapshotInUrl(snapshot);

      setState({
        ...gameState,
        isLoading: true,
        loadingState: 'thinking',
        currentVote: null,
      });

      // New games are always awaiting_llm, start generation
      if (status === 'awaiting_llm') {
        await startLLMGeneration(snapshot, gameState);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [startLLMGeneration]);

  // Submit vote choices (two-step: instant turn submission, then LLM stream)
  const submitChoices = useCallback(async (choices: VoteChoices) => {
    if (!state.snapshot) return;

    setState(prev => ({
      ...prev,
      isLoading: true,
      loadingState: 'thinking',
    }));
    setError(null);

    try {
      // Step 1: Submit player turn (instant)
      const { snapshot: newSnapshot, state: newState } = await submitTurn(state.snapshot, choices);
      setSnapshotInUrl(newSnapshot);

      // Update state with player's choice recorded
      setState(prev => ({
        ...prev,
        snapshot: newSnapshot,
        events: newState.events,
        currentVote: null, // Clear vote since we just answered it
      }));

      // Step 2: Start LLM generation
      await startLLMGeneration(newSnapshot, newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
      setState(prev => ({ ...prev, isLoading: false, loadingState: 'none' }));
    }
  }, [state.snapshot, startLLMGeneration]);

  // Load post-game summary
  const loadSummary = useCallback(async () => {
    if (!state.snapshot || !state.isGameOver) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await streamSummary(state.snapshot, {
        onPartial: (partial) => {
          setSummary(partial as SummaryResponse);
        },
        onComplete: (response) => {
          setSummary(response);
          setState(prev => ({ ...prev, isLoading: false }));
        },
        onError: (err) => {
          setError(err.message);
          setState(prev => ({ ...prev, isLoading: false }));
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.snapshot, state.isGameOver]);

  // Reset to tutorial
  const resetGame = useCallback(() => {
    setSnapshotInUrl(null);
    setState(initialState);
    setSummary(null);
    setError(null);
  }, []);

  return {
    state,
    summary,
    error,
    startGame,
    submitChoices,
    loadSummary,
    resetGame,
  };
}

export default useGameState;
