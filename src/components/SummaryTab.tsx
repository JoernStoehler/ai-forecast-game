import type { SummaryResponse, GameState } from '../types/game';
import { formatDate } from '../types/game';
import { getPreset } from '../prompts/presets';

interface SummaryTabProps {
  state: GameState;
  summary: SummaryResponse | null;
  isLoading: boolean;
  onNewGame: () => void;
  onShare: () => void;
}

export function SummaryTab({ state, summary, isLoading, onNewGame, onShare }: SummaryTabProps) {
  const preset = getPreset(state.preset);
  const voteCount = state.events.filter(e => e.type === 'voteChoices').length;

  if (isLoading || !summary) {
    return (
      <div className="summary-tab summary-tab-loading">
        <div className="loading-spinner">Generating summary...</div>
      </div>
    );
  }

  return (
    <div className="summary-tab">
      <section className="summary-section">
        <h2>What Happened</h2>
        <p className="summary-what-happened">{summary.whatHappened}</p>
      </section>

      {preset && (
        <section className="summary-section">
          <h2>Preset: {preset.name}</h2>
          <p className="summary-preset-description">{preset.description}</p>
        </section>
      )}

      <section className="summary-section">
        <h2>Stats</h2>
        <ul className="summary-stats">
          <li className="summary-stat">
            <span className="stat-icon">📅</span>
            <span className="stat-label">Final date:</span>
            <span className="stat-value">{formatDate(state.date)}</span>
          </li>
          <li className="summary-stat">
            <span className="stat-icon">📜</span>
            <span className="stat-label">Decisions made:</span>
            <span className="stat-value">{voteCount}</span>
          </li>
          {summary.stats.map((stat, i) => (
            <li key={i} className="summary-stat">
              <span className="stat-icon">{stat.icon}</span>
              <span className="stat-label">{stat.label}:</span>
              <span className="stat-value">{stat.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="summary-actions">
        <button className="summary-share-button" onClick={onShare}>
          Share
        </button>
        <button className="summary-new-button" onClick={onNewGame}>
          New Game
        </button>
      </div>
    </div>
  );
}

export default SummaryTab;
