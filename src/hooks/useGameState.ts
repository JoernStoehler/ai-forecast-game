import { useState, useCallback, useEffect } from 'react';
import type { GameState, UIState, VoteEvent, VoteChoices, TurnResponse, SummaryResponse, GameEvent } from '../types/game';
import { createGame, loadGame, submitVote, fetchSummary } from '../api/client';

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

  // Load game from URL on mount
  useEffect(() => {
    const snapshot = getSnapshotFromUrl();
    if (snapshot) {
      setState(prev => ({ ...prev, isLoading: true }));
      loadGame(snapshot)
        .then(gameState => {
          setState({
            ...gameState,
            isLoading: false,
            loadingState: 'none',
            currentVote: extractCurrentVote(gameState.events),
          });
        })
        .catch(err => {
          setError(err.message);
          setState(prev => ({ ...prev, isLoading: false }));
        });
    }
  }, []);

  // Start a new game
  const startGame = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    setError(null);
    setSummary(null);

    try {
      const { snapshot, state: gameState } = await createGame();
      setSnapshotInUrl(snapshot);

      // After creating, we need to trigger the first turn to get initial events
      setState({
        ...gameState,
        isLoading: true,
        loadingState: 'thinking',
        currentVote: null,
      });

      // Submit empty choices to get the first turn
      await submitVote(snapshot, {}, {
        onPartial: (partial) => {
          if (partial.events && partial.events.length > 0) {
            setState(prev => ({
              ...prev,
              loadingState: 'typing',
            }));
          }
        },
        onComplete: (response, newSnapshot) => {
          setSnapshotInUrl(newSnapshot);

          const newEvents: GameEvent[] = [
            ...response.events,
          ];

          if (response.vote) {
            newEvents.push({
              type: 'vote' as const,
              topics: response.vote.topics,
            });
          }

          setState(prev => ({
            ...prev,
            snapshot: newSnapshot,
            events: newEvents,
            phase: response.phase,
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
      setError(err instanceof Error ? err.message : 'Failed to start game');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Submit vote choices
  const submitChoices = useCallback(async (choices: VoteChoices) => {
    if (!state.snapshot) return;

    setState(prev => ({
      ...prev,
      isLoading: true,
      loadingState: 'thinking',
    }));
    setError(null);

    try {
      await submitVote(state.snapshot, choices, {
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

          setState(prev => {
            const newEvents: GameEvent[] = [
              ...prev.events,
              { type: 'voteChoices' as const, choices },
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

            return {
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
            };
          });
        },
        onError: (err) => {
          setError(err.message);
          setState(prev => ({ ...prev, isLoading: false, loadingState: 'none' }));
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
      setState(prev => ({ ...prev, isLoading: false, loadingState: 'none' }));
    }
  }, [state.snapshot]);

  // Load post-game summary
  const loadSummary = useCallback(async () => {
    if (!state.snapshot || !state.isGameOver) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await fetchSummary(state.snapshot, {
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
