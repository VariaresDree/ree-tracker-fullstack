// src/features/reference/TopicCardsLink.jsx
//
// Under a missed question: the formula cards for its topic ("Formula cards:
// Machines (3)"), opening Library › Formula cards at that topic. Shows
// nothing when the topic has no cards, or the list isn't on this device yet.
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui';
import { Sigma } from '../../components/ui/icons';
import { useTopicCards } from './useTopicCards';
import { topicCardsLink } from './topicCards';

/**
 * @param {{ topicId?: string|null, topic?: string|null, subject?: string|null, className?: string }} props
 */
export default function TopicCardsLink({ topicId = null, topic = null, subject = null, className = '' }) {
  const cards = useTopicCards({ topicId, topic, subject });
  if (cards.length === 0) return null;
  // Library lists a topic's cards under the card's own subject and name.
  const [first] = cards;
  const inTopic = cards.filter((c) => c.subject === first.subject && c.topic?.name === first.topic.name).length;
  const link = topicCardsLink(first.subject, first.topic.name);
  return (
    <Button as={Link} to={link.to} state={link.state} size="sm" variant="secondary" className={`self-start ${className}`}>
      <Sigma size={14} strokeWidth={1.75} aria-hidden="true" /> Formula cards: {first.topic.name} ({inTopic})
    </Button>
  );
}
