export type TabId = 'tutorial' | 'news' | 'vote' | 'summary';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  visibleTabs: TabId[];
}

const TAB_LABELS: Record<TabId, string> = {
  tutorial: 'Tutorial',
  news: 'News',
  vote: 'Vote',
  summary: 'Summary',
};

export function TabBar({ activeTab, onTabChange, visibleTabs }: TabBarProps) {
  return (
    <nav className="tab-bar">
      {visibleTabs.map(tabId => (
        <button
          key={tabId}
          className={`tab-button ${activeTab === tabId ? 'tab-button-active' : ''}`}
          onClick={() => onTabChange(tabId)}
        >
          {TAB_LABELS[tabId]}
        </button>
      ))}
    </nav>
  );
}

export default TabBar;
