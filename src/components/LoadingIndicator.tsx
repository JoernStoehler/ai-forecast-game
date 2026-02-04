interface LoadingIndicatorProps {
  state: 'thinking' | 'typing';
}

export function LoadingIndicator({ state }: LoadingIndicatorProps) {
  const text = state === 'thinking' ? 'thinking...' : 'typing...';

  return (
    <div className="loading-indicator">
      <span className="loading-dots">●●●</span>
      <span className="loading-text">{text}</span>
    </div>
  );
}

export default LoadingIndicator;
