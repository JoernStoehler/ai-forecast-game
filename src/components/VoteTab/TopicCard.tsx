import type { Topic } from '../../types/game';

interface TopicCardProps {
  topic: Topic;
  selectedOption: string | null;
  onSelect: (topicId: string, optionId: string) => void;
}

export function TopicCard({ topic, selectedOption, onSelect }: TopicCardProps) {
  return (
    <div className="topic-card">
      <div className="topic-header">
        <h3 className="topic-title">TOPIC: {topic.title}</h3>
        {topic.description && (
          <p className="topic-description">{topic.description}</p>
        )}
      </div>

      <div className="topic-options">
        {topic.options.map(option => (
          <label key={option.id} className="topic-option">
            <input
              type="radio"
              name={`topic-${topic.id}`}
              value={option.id}
              checked={selectedOption === option.id}
              onChange={() => onSelect(topic.id, option.id)}
            />
            <span className="option-content">
              <span className="option-title">{option.title}</span>
              {option.description && (
                <span className="option-description">{option.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default TopicCard;
