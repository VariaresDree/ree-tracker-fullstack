// src/features/reference/PractiseTopicsButton.jsx
//
// The end of a formula-card review: "Practise these topics", two questions on
// each topic just reviewed, as a Practice set (practiseTopics.js).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui';
import { Target } from '../../components/ui/icons';
import { itemsPreset, launchPractice } from '../active-recall/presets';
import { PER_TOPIC, questionsForTopics } from './practiseTopics';

/** @param {{ topics: Array<{ subject: string, topic: string }> }} props  at least one */
export default function PractiseTopicsButton({ topics }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    const items = await questionsForTopics(topics);
    if (items.length === 0) {
      setBusy(false);
      toast.error(navigator.onLine
        ? 'No questions on these topics yet.'
        : 'No questions on these topics are saved on this device. Reconnect and try again.');
      return;
    }
    launchPractice(navigate, itemsPreset(items));
  };

  const names = topics.map((t) => t.topic).join(', ');
  return (
    <div className="flex flex-col items-center gap-2">
      <Button tone="accent" onClick={start} loading={busy} disabled={busy}>
        {!busy && <Target size={16} strokeWidth={1.75} aria-hidden="true" />} Practise these topics
      </Button>
      <p className="text-xs text-muted2 text-center max-w-sm">{PER_TOPIC} questions on each: {names}.</p>
    </div>
  );
}
