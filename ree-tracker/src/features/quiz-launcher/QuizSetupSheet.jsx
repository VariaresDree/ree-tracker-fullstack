// src/features/quiz-launcher/QuizSetupSheet.jsx
//
// How to take a quiz: Practice shows the answer after each pick, Exam holds them
// all until the whole set is in. The last setup is remembered on this device.
import { useState } from 'react';
import { Button, FormField, Modal, SegmentedControl } from '../../components/ui';
import { DEFAULT_SETUP } from './quizRun';

const REMEMBERED = 'ree:quiz-setup';

function readSetup() {
  try {
    return { ...DEFAULT_SETUP, ...JSON.parse(localStorage.getItem(REMEMBERED) || '{}') };
  } catch {
    return DEFAULT_SETUP;
  }
}

const COUNTS = [10, 20, 50];
const MODE_LINE = {
  practice: 'See the answer and any explanation right after each pick.',
  exam: 'Change your answers as you go. Nothing is revealed until you submit the whole set.',
};

export default function QuizSetupSheet({ quiz, onClose, onStart }) {
  const [setup, setSetup] = useState(readSetup);
  const total = quiz.result.questions.length;
  const count = setup.count !== 'all' && setup.count < total ? setup.count : total;
  const minutes = setup.mode === 'exam' ? count * setup.minutesEach : 0;
  const change = (patch) => {
    const next = { ...setup, ...patch };
    setSetup(next);
    try { localStorage.setItem(REMEMBERED, JSON.stringify(next)); } catch { /* a convenience */ }
  };
  const summary = [
    `${count} question${count === 1 ? '' : 's'}`,
    setup.mode === 'exam' ? 'exam' : 'practice',
    minutes ? `${minutes} min` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Modal
      open
      onClose={onClose}
      title={quiz.fileName}
      footer={(
        <>
          <p className="mr-auto min-w-0 text-sm font-medium text-textMain tabular-nums">{summary}</p>
          <Button className="shrink-0" onClick={() => onStart({ ...setup, count: count === total ? 'all' : count })}>Start quiz</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        <FormField label="Mode" hint={MODE_LINE[setup.mode]}>
          <SegmentedControl
            label="Mode"
            value={setup.mode}
            onChange={(mode) => change({ mode })}
            options={[{ value: 'practice', label: 'Practice' }, { value: 'exam', label: 'Exam' }]}
          />
        </FormField>
        <FormField label="Questions">
          <SegmentedControl
            label="Questions"
            value={count === total ? 'all' : count}
            onChange={(v) => change({ count: v })}
            options={[
              { value: 'all', label: `All ${total}` },
              ...COUNTS.filter((n) => n < total).map((n) => ({ value: n, label: String(n) })),
            ]}
          />
        </FormField>
        <FormField label="Order" hint="Choices always shuffle, since quiz files tend to list the right one first.">
          <SegmentedControl
            label="Order"
            value={setup.order}
            onChange={(order) => change({ order })}
            options={[{ value: 'file', label: 'As in the file' }, { value: 'shuffled', label: 'Shuffled' }]}
          />
        </FormField>
        {setup.mode === 'exam' && (
          <FormField label="Time limit" hint={minutes ? `Per question, so ${minutes} minutes in all. It submits by itself when time is up.` : 'The clock just counts up.'}>
            <SegmentedControl
              label="Time limit"
              value={setup.minutesEach}
              onChange={(minutesEach) => change({ minutesEach })}
              options={[
                { value: 0, label: 'None' },
                { value: 1, label: '1 min' },
                { value: 2, label: '2 min' },
                { value: 3, label: '3 min' },
              ]}
            />
          </FormField>
        )}
      </div>
    </Modal>
  );
}
