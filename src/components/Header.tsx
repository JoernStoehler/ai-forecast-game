import { formatDate, type GameDate } from '../types/game';

interface HeaderProps {
  date: GameDate;
  phase: string;
  onNewGame: () => void;
  showNewButton: boolean;
}

export function Header({ date, phase, onNewGame, showNewButton }: HeaderProps) {
  const isEndState = phase === 'EXTINCTION' || phase === 'UTOPIA';
  const phaseClass = isEndState
    ? phase === 'EXTINCTION'
      ? 'header-phase-extinction'
      : 'header-phase-utopia'
    : '';

  return (
    <header className="header">
      <div className="header-date">{formatDate(date)}</div>
      <div className={`header-phase ${phaseClass}`}>
        Phase: {phase}
      </div>
      {showNewButton && (
        <button className="header-new-button" onClick={onNewGame}>
          New
        </button>
      )}
    </header>
  );
}

export default Header;
