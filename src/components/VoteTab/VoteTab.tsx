import { useState, useCallback, useEffect } from 'react';
import type { VoteEvent, VoteChoices } from '../../types/game';
import { TopicCard } from './TopicCard';
import { SubmitButton } from './SubmitButton';

interface VoteTabProps {
  vote: VoteEvent | null;
  onSubmit: (choices: VoteChoices) => void;
  isLoading: boolean;
}

export function VoteTab({ vote, onSubmit, isLoading }: VoteTabProps) {
  const [selections, setSelections] = useState<VoteChoices>({});

  // Reset selections when vote changes
  useEffect(() => {
    setSelections({});
  }, [vote]);

  const handleSelect = useCallback((topicId: string, optionId: string) => {
    setSelections(prev => ({
      ...prev,
      [topicId]: optionId,
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(selections);
  }, [selections, onSubmit]);

  if (!vote) {
    return (
      <div className="vote-tab vote-tab-empty">
        <p>No decisions pending. Waiting for events...</p>
      </div>
    );
  }

  const allTopicsSelected = vote.topics.every(topic => selections[topic.id]);

  return (
    <div className="vote-tab">
      <div className="topic-list">
        {vote.topics.map(topic => (
          <TopicCard
            key={topic.id}
            topic={topic}
            selectedOption={selections[topic.id] || null}
            onSelect={handleSelect}
          />
        ))}
      </div>

      <SubmitButton
        disabled={!allTopicsSelected}
        isLoading={isLoading}
        onClick={handleSubmit}
      />
    </div>
  );
}

export default VoteTab;
