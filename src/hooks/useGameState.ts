import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, UIState, VoteEvent, VoteChoices, TurnResponse, SummaryResponse, GameEvent } from '../types/game';
import { createGame, loadSnapshot, submitVote, generate, pollUntilReady } from '../api/client';

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
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.type === 'vote') {
      return event;
    }
    if (event.type === 'voteChoices') {
      return null;
    }
  }
  return null;
}

function getWhoseTurn(state: GameState): 'player' | 'llm' | 'summary' | 'done' {
  if (state.events.length === 0) return 'llm';
  if ('summary' in state && state.summary) return 'done';
  if (state.isGameOver) return 'summary';

  const lastEvent = state.events[state.events.length - 1];
  if (lastEvent.type === 'voteChoices') return 'llm';
  if (lastEvent.type === 'vote') return 'player';

  return 'llm';
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
  const [error, setError] = useState<string | null>(null);

  // Track current generation snapshot for recovery
  const pendingSnapshotRef = useRef<string | null>(null);

  // Apply state update from loaded GameState
  const applyState = useCallback((gameState: GameState, snapshot: string) => {
    setState({
      ...gameState,
      snapshot,
      isLoading: false,
      loadingState: 'none',
      currentVote: extractCurrentVote(gameState.events),
    });
  }, []);

  // Start generation and handle streaming
  const startGeneration = useCallback(async (sourceId: string, sourceState: GameState) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      loadingState: 'thinking',
    }));

    try {
      const newSnapshot = await generate(sourceId, {
        onPartial: (partial) => {
          if ('events' in partial && partial.events && partial.events.length > 0) {
            setState(prev => ({ ...prev, loadingState: 'typing' }));
          }
        },
        onComplete: (response) => {
          // Build new state from response
          if ('events' in response) {
            // TurnResponse
            const turnResponse = response as TurnResponse;
            const newEvents: GameEvent[] = [...sourceState.events, ...turnResponse.events];

            if (turnResponse.vote) {
              newEvents.push({ type: 'vote' as const, topics: turnResponse.vote.topics });
            }
            if (turnResponse.gameOver) {
              newEvents.push({ type: 'gameOver' as const, outcome: turnResponse.gameOver.outcome });
            }

            const lastNews = turnResponse.events[turnResponse.events.length - 1];

            setState(prev => ({
              ...prev,
              snapshot: pendingSnapshotRef.current || prev.snapshot,
              events: newEvents,
              phase: turnResponse.gameOver ? turnResponse.gameOver.outcome : turnResponse.phase,
              date: lastNews ? lastNews.date : prev.date,
              isGameOver: !!turnResponse.gameOver,
              isLoading: false,
              loadingState: 'none',
              currentVote: turnResponse.vote ? { type: 'vote', topics: turnResponse.vote.topics } : null,
            }));
          } else {
            // SummaryResponse
            setState(prev => ({
              ...prev,
              snapshot: pendingSnapshotRef.current || prev.snapshot,
              summary: response as SummaryResponse,
              isLoading: false,
              loadingState: 'none',
            }));
          }

          pendingSnapshotRef.current = null;
        },
        onError: (err) => {
          setError(err.message);
          setState(prev => ({ ...prev, isLoading: false, loadingState: 'none' }));
          pendingSnapshotRef.current = null;
        },
      });

      // Store the pending snapshot ID and update URL
      pendingSnapshotRef.current = newSnapshot;
      setSnapshotInUrl(newSnapshot);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation');
      setState(prev => ({ ...prev, isLoading: false, loadingState: 'none' }));
    }
  }, []);

  // Load game from URL on mount
  useEffect(() => {
    const snapshot = getSnapshotFromUrl();
    if (!snapshot) return;

    setState(prev => ({ ...prev, isLoading: true }));

    loadSnapshot(snapshot)
      .then(async (result) => {
        if (result.status === 'exists') {
          applyState(result.state, snapshot);

          // If it's LLM's turn, auto-start generation
          const turn = getWhoseTurn(result.state);
          if (turn === 'llm' || turn === 'summary') {
            await startGeneration(snapshot, result.state);
          }
        } else if (result.status === 'generating') {
          // Poll until ready
          setState(prev => ({ ...prev, loadingState: 'thinking' }));
          const state = await pollUntilReady(snapshot);
          applyState(state, snapshot);
        } else if (result.status === 'failed') {
          setError('This snapshot failed to generate. Please go back and try again.');
          setState(prev => ({ ...prev, isLoading: false }));
        } else {
          setError('Snapshot not found');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      })
      .catch(err => {
        setError(err.message);
        setState(prev => ({ ...prev, isLoading: false }));
      });
  }, [applyState, startGeneration]);

  // Start a new game
  const startGame = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    setError(null);

    try {
      const snapshot = await createGame();
      setSnapshotInUrl(snapshot);

      // Load the initial state
      const result = await loadSnapshot(snapshot);
      if (result.status !== 'exists' || !result.state) {
        throw new Error('Failed to load new game');
      }

      setState({
        ...result.state,
        snapshot,
        isLoading: true,
        loadingState: 'thinking',
        currentVote: null,
      });

      // Start initial generation
      await startGeneration(snapshot, result.state);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [startGeneration]);

  // Submit vote choices
  const submitChoices = useCallback(async (choices: VoteChoices) => {
    if (!state.snapshot) return;

    setState(prev => ({ ...prev, isLoading: true, loadingState: 'thinking' }));
    setError(null);

    try {
      // Submit vote (instant) → get new snapshot
      const newSnapshot = await submitVote(state.snapshot, choices);
      setSnapshotInUrl(newSnapshot);

      // Load the new state (has player's choice saved)
      const result = await loadSnapshot(newSnapshot);
      if (result.status !== 'exists' || !result.state) {
        throw new Error('Failed to load state after vote');
      }

      setState(prev => ({
        ...prev,
        snapshot: newSnapshot,
        events: result.state.events,
        currentVote: null,
      }));

      // Start LLM generation
      await startGeneration(newSnapshot, result.state);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
      setState(prev => ({ ...prev, isLoading: false, loadingState: 'none' }));
    }
  }, [state.snapshot, startGeneration]);

  // Reset to tutorial
  const resetGame = useCallback(() => {
    setSnapshotInUrl(null);
    setState(initialState);
    setError(null);
    pendingSnapshotRef.current = null;
  }, []);

  return {
    state,
    error,
    startGame,
    submitChoices,
    resetGame,
  };
}

export default useGameState;
