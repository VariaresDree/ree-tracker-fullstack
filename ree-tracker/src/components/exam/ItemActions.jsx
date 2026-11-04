// src/components/exam/ItemActions.jsx
//
// What you can do with the item in front of you: mark it, work on the scratchpad,
// report it, save it. Practice, the mock and the Gauntlet each had their own row,
// with their own words. Leave out a handler and its button goes with it.
// `onReport` gets the reason picked: one tap, since a clock may be running.
import { useState } from 'react';
import { Button, Modal } from '../ui';
import { Bookmark, Calculator, Flag, Pencil, Pin } from '../ui/icons';
import { COPY, REPORT_REASONS } from '../../features/quiz/examCopy';

export default function ItemActions({ marked, onMark, onScratchpad, onTools, reported, onReport, bookmarked, onBookmark, children }) {
  const [reporting, setReporting] = useState(false);
  return (
    <div className="flex gap-1.5">
      {onMark && (
        <Button size="icon" variant="ghost" tone="amber" onClick={onMark} aria-pressed={!!marked} aria-label={marked ? COPY.unmark : COPY.mark} title={marked ? COPY.unmark : COPY.mark} className={marked ? '' : 'text-muted'}>
          <Pin size={16} strokeWidth={1.75} fill={marked ? 'currentColor' : 'none'} aria-hidden="true" />
        </Button>
      )}
      {onScratchpad && (
        <Button size="icon" variant="ghost" onClick={onScratchpad} aria-label={COPY.scratchpad} title={COPY.scratchpad} className="text-muted hover:text-textMain">
          <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      )}
      {onTools && (
        <Button size="icon" variant="ghost" onClick={onTools} aria-label={COPY.tools} title={COPY.tools} className="text-muted2">
          <Calculator size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      )}
      {onReport && (
        <Button size="icon" variant="ghost" tone="danger" onClick={() => setReporting(true)} disabled={reported} aria-label={reported ? COPY.reported : COPY.report} title={reported ? COPY.reported : COPY.report} className={reported ? '' : 'text-muted'}>
          <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      )}
      {onBookmark && (
        <Button size="icon" variant="ghost" tone="amber" onClick={onBookmark} aria-pressed={!!bookmarked} aria-label={bookmarked ? COPY.saved : COPY.save} title={bookmarked ? COPY.saved : COPY.save} className={bookmarked ? '' : 'text-muted'}>
          <Bookmark size={16} strokeWidth={1.75} fill={bookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
        </Button>
      )}
      {children}
      <Modal open={reporting} onClose={() => setReporting(false)} title="What’s wrong with this question?" size="sm">
        <div className="flex flex-col gap-2">
          {REPORT_REASONS.map((reason) => (
            <Button key={reason} variant="secondary" className="w-full justify-start text-left" onClick={() => { setReporting(false); onReport(reason); }}>
              {reason}
            </Button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
