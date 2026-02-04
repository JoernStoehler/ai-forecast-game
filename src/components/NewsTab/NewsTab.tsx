import type { NewsEvent, GameEvent } from '../../types/game';
import { NewsItem } from './NewsItem';
import { LoadingIndicator } from '../LoadingIndicator';

interface NewsTabProps {
  events: GameEvent[];
  loadingState: 'none' | 'thinking' | 'typing';
  isPostGame: boolean;
}

interface GroupedNews {
  year: number;
  months: {
    month: number;
    events: NewsEvent[];
  }[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function groupNewsByDate(events: GameEvent[]): GroupedNews[] {
  const newsEvents = events.filter((e): e is NewsEvent => e.type === 'news');

  const grouped = new Map<number, Map<number, NewsEvent[]>>();

  for (const event of newsEvents) {
    const { year, month } = event.date;

    if (!grouped.has(year)) {
      grouped.set(year, new Map());
    }

    const yearMap = grouped.get(year)!;
    if (!yearMap.has(month)) {
      yearMap.set(month, []);
    }

    yearMap.get(month)!.push(event);
  }

  const result: GroupedNews[] = [];

  const sortedYears = Array.from(grouped.keys()).sort((a, b) => a - b);
  for (const year of sortedYears) {
    const yearMap = grouped.get(year)!;
    const months: GroupedNews['months'] = [];

    const sortedMonths = Array.from(yearMap.keys()).sort((a, b) => a - b);
    for (const month of sortedMonths) {
      months.push({
        month,
        events: yearMap.get(month)!,
      });
    }

    result.push({ year, months });
  }

  return result;
}

export function NewsTab({ events, loadingState, isPostGame }: NewsTabProps) {
  const grouped = groupNewsByDate(events);

  if (grouped.length === 0 && loadingState === 'none') {
    return (
      <div className="news-tab news-tab-empty">
        <p>No news events yet. Start the game to see events unfold.</p>
      </div>
    );
  }

  return (
    <div className="news-tab">
      {grouped.map(yearGroup => (
        <div key={yearGroup.year} className="news-year-group">
          <div className="news-year-marker">{yearGroup.year}</div>

          {yearGroup.months.map(monthGroup => (
            <div key={`${yearGroup.year}-${monthGroup.month}`} className="news-month-group">
              <div className="news-month-marker">
                {MONTH_NAMES[monthGroup.month - 1]}
              </div>

              <div className="news-items">
                {monthGroup.events.map((event, i) => (
                  <NewsItem
                    key={`${yearGroup.year}-${monthGroup.month}-${i}`}
                    event={event}
                    showHidden={isPostGame}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {loadingState !== 'none' && (
        <LoadingIndicator state={loadingState} />
      )}
    </div>
  );
}

export default NewsTab;
