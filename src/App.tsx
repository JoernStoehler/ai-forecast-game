import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { TabBar, type TabId } from './components/TabBar';
import { TutorialTab } from './components/TutorialTab';
import { NewsTab } from './components/NewsTab/NewsTab';
import { VoteTab } from './components/VoteTab/VoteTab';
import { SummaryTab } from './components/SummaryTab';
import { useGameState } from './hooks/useGameState';
import './App.css';

export default function App() {
  const {
    state,
    summary,
    error,
    startGame,
    submitChoices,
    loadSummary,
    resetGame,
  } = useGameState();

  const [activeTab, setActiveTab] = useState<TabId>('tutorial');

  // Determine which tabs are visible
  const visibleTabs = useMemo((): TabId[] => {
    if (!state.snapshot) {
      return ['tutorial'];
    }
    if (state.isGameOver) {
      return ['news', 'summary'];
    }
    return ['news', 'vote'];
  }, [state.snapshot, state.isGameOver]);

  // Auto-switch tabs based on game state
  useEffect(() => {
    if (!state.snapshot) {
      setActiveTab('tutorial');
    } else if (state.isGameOver) {
      setActiveTab('summary');
      loadSummary();
    } else if (state.currentVote) {
      // Don't auto-switch if user is on news tab
      if (activeTab === 'tutorial') {
        setActiveTab('news');
      }
    } else {
      setActiveTab('news');
    }
  }, [state.snapshot, state.isGameOver, state.currentVote, loadSummary, activeTab]);

  const handleNewGame = useCallback(() => {
    if (state.snapshot && !state.isGameOver) {
      // Confirm abandoning current game
      if (!window.confirm('Abandon current game and start a new one?')) {
        return;
      }
    }
    resetGame();
    startGame();
  }, [state.snapshot, state.isGameOver, resetGame, startGame]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: 'AI Forecast Game',
        text: summary?.shareText || 'Can you prevent human extinction?',
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  }, [summary]);

  // Show new button except on tutorial
  const showNewButton = state.snapshot !== null;

  return (
    <div className="app">
      <Header
        date={state.date}
        phase={state.phase}
        onNewGame={handleNewGame}
        showNewButton={showNewButton}
      />

      {visibleTabs.length > 1 && (
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          visibleTabs={visibleTabs}
        />
      )}

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      <main className="main-content">
        {activeTab === 'tutorial' && (
          <TutorialTab
            onStartGame={startGame}
            isLoading={state.isLoading}
          />
        )}

        {activeTab === 'news' && (
          <NewsTab
            events={state.events}
            loadingState={state.loadingState}
            isPostGame={state.isGameOver}
          />
        )}

        {activeTab === 'vote' && (
          <VoteTab
            vote={state.currentVote}
            onSubmit={submitChoices}
            isLoading={state.isLoading}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryTab
            state={state}
            summary={summary}
            isLoading={state.isLoading && !summary}
            onNewGame={handleNewGame}
            onShare={handleShare}
          />
        )}
      </main>
    </div>
  );
}
