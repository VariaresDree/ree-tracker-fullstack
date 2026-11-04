// src/components/exam/KeyLegend.jsx
//
// Every shortcut this session has, on a button or the ? key. It replaces a
// "Hotkeys on" pill that said they existed but not what they were. A touch screen
// has no keys, so there the button goes.
import { useEffect, useState } from 'react';
import { Button, KBD, Modal } from '../ui';
import { Keyboard } from '../ui/icons';
import { COPY } from '../../features/quiz/examCopy';
import { shouldIgnoreHotkey } from '../../utils/hotkeys';

export default function KeyLegend({ keys }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === '?' && !shouldIgnoreHotkey(e)) setOpen(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <span className="hidden sm:contents pointer-coarse:hidden">
        <Button size="icon" variant="ghost" onClick={() => setOpen(true)} aria-label={`${COPY.keys} (?)`} title={`${COPY.keys} (?)`} className="text-muted hover:text-textMain">
          <Keyboard size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </span>
      <Modal open={open} onClose={() => setOpen(false)} title={COPY.keys} size="sm">
        <dl className="flex flex-col gap-2">
          {[...keys, ['?', 'This list']].map(([key, what]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-muted2">{what}</dt>
              <dd><KBD>{key}</KBD></dd>
            </div>
          ))}
        </dl>
      </Modal>
    </>
  );
}
