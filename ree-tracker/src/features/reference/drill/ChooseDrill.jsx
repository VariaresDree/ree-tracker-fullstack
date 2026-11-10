// src/features/reference/drill/ChooseDrill.jsx
//
// One of four: the shared QuestionCard, so choices look and answer as they do
// everywhere else. A pick shows the answer at once, and a miss shows the whole card.
import { useState } from 'react';
import QuestionCard from '../../quiz/QuestionCard';
import { Button, QuestionSurface, StatusPill } from '../../../components/ui';
import { ChevronRight, X } from '../../../components/ui/icons';
import CardBody from '../CardBody';

export default function ChooseDrill({ questions, ask, onMiss, onFinish, onExit }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [missed, setMissed] = useState([]);
  const q = questions[index];
  const revealed = picked != null;
  const wrong = revealed && picked !== q.answer;

  const pick = (option) => {
    if (revealed) return;
    setPicked(option);
    if (option !== q.answer) {
      setMissed((prev) => [...prev, q.card]);
      onMiss(q.card);
    }
  };
  const next = () => {
    if (index === questions.length - 1) onFinish({ total: questions.length, missed });
    else {
      setIndex(index + 1);
      setPicked(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X size={14} strokeWidth={1.75} aria-hidden="true" /> Exit drill
        </Button>
        <StatusPill tone="neutral" dot={false}>{index + 1} / {questions.length}</StatusPill>
      </div>
      <QuestionSurface>
        <p className="text-eyebrow mb-3">{ask === 'name' ? 'What is this called?' : 'Which is the right one?'}</p>
        <QuestionCard
          key={q.card.id}
          question={{ text: q.text, options: q.options, answer: q.answer }}
          selectedOption={picked}
          state={revealed ? 'reviewing' : 'answering'}
          showConfidence={false}
          hotkeys
          onSelect={pick}
        />
        {wrong && <div className="mt-5"><CardBody card={q.card} /></div>}
      </QuestionSurface>
      {revealed && (
        <Button className="self-end" onClick={next}>
          {index === questions.length - 1 ? 'See how you did' : 'Next'} <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
