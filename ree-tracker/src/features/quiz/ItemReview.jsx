// src/features/quiz/ItemReview.jsx
//
// Going back over a finished set, one item at a time: what you picked, the answer,
// the solution open, and what you can do with it. For a Practice session and the
// placement test, which listed the first ten misses with no solution, or only
// linked away. A sitting's own review page (pages/SittingReview.jsx) does more.
//
// `items` are { question, selected, isCorrect }, in the order they were answered.
import { useState } from 'react';
import { Button, QuestionSurface, SegmentedControl } from '../../components/ui';
import ExamNavigator from '../../components/exam/ExamNavigator';
import ItemActions from '../../components/exam/ItemActions';
import { useAuth } from '../../contexts/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { ITEM_FOCUS_CLASS, useItemFocus } from '../../hooks/useItemFocus';
import { explanationKey } from '../../services/aiExplanations';
import NoteButton, { NoteView } from '../notebook/NoteButton';
import { questionTarget } from '../notebook/targets';
import { COPY, itemOf } from './examCopy';
import QuestionCard from './QuestionCard';
import SolutionPanel from './SolutionPanel';
import { useAiExplanation } from './useAiExplanation';
import { useItemTools } from './useItemTools';

export default function ItemReview({ items, headingLevel = 3 }) {
  const uid = useAuth()?.currentUser?.uid;
  const isOnline = useNetworkStatus();
  const ai = useAiExplanation(uid);
  const tools = useItemTools(uid);
  const missedCount = items.filter((i) => !i.isCorrect).length;
  const [filter, setFilter] = useState(missedCount > 0 ? 'missed' : 'all');
  const [pos, setPos] = useState(0);
  const shown = filter === 'missed' ? items.filter((i) => !i.isCorrect) : items;
  const at = Math.min(pos, Math.max(0, shown.length - 1));
  const item = shown[at];
  const itemRef = useItemFocus(item?.question?.id);
  if (!item) return null;
  const { question } = item;

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {missedCount > 0 && missedCount < items.length && (
        <SegmentedControl
          label="Show"
          value={filter}
          onChange={(v) => { setFilter(v); setPos(0); }}
          options={[{ value: 'missed', label: `Missed ${missedCount}` }, { value: 'all', label: `All ${items.length}` }]}
        />
      )}
      {shown.length > 1 && (
        <ExamNavigator
          count={shown.length}
          currentIndex={at}
          onSelect={setPos}
          isAnswered={() => true}
          reviewStateOf={(i) => (shown[i].isCorrect ? 'correct' : 'incorrect')}
          numberOf={(i) => items.indexOf(shown[i]) + 1}
        />
      )}
      <div ref={itemRef} tabIndex={-1} className={ITEM_FOCUS_CLASS}>
        <QuestionSurface className="gap-6">
          <p className="text-xs font-medium text-textMain">{itemOf(items.indexOf(item), items.length)}</p>
          <QuestionCard
            question={question}
            selectedOption={item.selected ?? null}
            state="reviewing"
            showConfidence={false}
            announce={false}
            headerSlot={question.id ? (
              <ItemActions
                reported={tools.reported.has(question.id) || question.isFlagged}
                onReport={(reason) => tools.report(question.id, reason)}
                bookmarked={tools.saved.has(question.id)}
                onBookmark={() => tools.toggleSave(question.id)}
              >
                <NoteButton type="question" targetId={question.id} target={questionTarget(question)} />
              </ItemActions>
            ) : null}
          />
          <SolutionPanel
            key={explanationKey(question)}
            question={question}
            isOnline={isOnline}
            aiText={ai.textFor(question)}
            aiLoading={ai.isLoading(question)}
            onExplain={(force) => ai.explain(question, { force })}
            showAnswer
            defaultOpen
            headingLevel={headingLevel}
          />
          {question.id && <NoteView type="question" targetId={question.id} target={questionTarget(question)} />}
          {shown.length > 1 && (
            <div className="flex justify-between gap-3 border-t border-border pt-5">
              <Button variant="secondary" onClick={() => setPos(at - 1)} disabled={at === 0}>{COPY.previous}</Button>
              <Button onClick={() => setPos(at + 1)} disabled={at === shown.length - 1}>{COPY.next}</Button>
            </div>
          )}
        </QuestionSurface>
      </div>
    </div>
  );
}
