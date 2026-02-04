interface TutorialTabProps {
  onStartGame: () => void;
  isLoading: boolean;
}

export function TutorialTab({ onStartGame, isLoading }: TutorialTabProps) {
  return (
    <div className="tutorial-tab">
      <div className="tutorial-hero">
        <h1 className="tutorial-title">AI Forecast Game</h1>
        <p className="tutorial-subtitle">Can you prevent human extinction?</p>
        <p className="tutorial-description">
          Navigate AI policy decisions in a simulation of the next decade.
          Your choices shape humanity's future.
        </p>
        <button
          className="tutorial-start-button"
          onClick={onStartGame}
          disabled={isLoading}
        >
          {isLoading ? 'Starting...' : 'Start Game'}
        </button>
      </div>

      <div className="tutorial-instructions">
        <h2>How to Play</h2>
        <ul>
          <li>Read news events as they unfold over time</li>
          <li>Make policy decisions on key AI topics</li>
          <li>Watch the consequences of your choices</li>
          <li>Try to delay or prevent extinction</li>
        </ul>
      </div>

      <footer className="tutorial-footer">
        <p>
          Based on forecasting research by Jörn Stöhler
        </p>
      </footer>
    </div>
  );
}

export default TutorialTab;
