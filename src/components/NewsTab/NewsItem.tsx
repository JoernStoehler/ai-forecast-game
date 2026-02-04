import type { NewsEvent } from '../../types/game';

interface NewsItemProps {
  event: NewsEvent;
  showHidden?: boolean;
}

export function NewsItem({ event, showHidden = false }: NewsItemProps) {
  const isRevealed = event.isHidden && showHidden;

  return (
    <div className={`news-item ${isRevealed ? 'news-item-revealed' : ''}`}>
      {isRevealed && <span className="news-revealed-icon">🔓</span>}
      <div className="news-headline">{event.headline}</div>
      {event.description && (
        <div className="news-description">{event.description}</div>
      )}
    </div>
  );
}

export default NewsItem;
