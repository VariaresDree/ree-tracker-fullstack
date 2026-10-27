// src/features/paper-sets/print/PrintToolbar.jsx
//
// The print preview's controls, on screen only: back, the set and its code,
// whether its changes are saved, the paper size, what to include, editing,
// Print, and More (the .tex, Overleaf, a new set, scanning, results, the
// exam timer).
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, SegmentedControl, StickyToolbar } from '../../../components/ui';
import {
  ArrowUpRight, ChevronDown, ChevronLeft, Copy, Download, FileText, ListChecks, Pencil, Shuffle, Timer,
} from '../../../components/ui/icons';
import { PAPER_OPTIONS, SYNC_TEXT } from './layout';

const DOCUMENTS = [['paper', 'Question paper'], ['sheet', 'Answer sheet'], ['key', 'Answer key']];

/** A disclosure: the button, then the list of actions below it. */
function MoreMenu({ children, onOpen }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      ref.current?.querySelector('button')?.focus();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="ree-more" ref={ref}>
      <Button
        variant="secondary"
        size="sm"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!open) onOpen?.();
          setOpen(!open);
        }}
      >
        More
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      {open && (
        // Choosing an action closes the list.
        <div id={panelId} className="ree-more-panel" onClick={(e) => { if (e.target.closest('a, button')) setOpen(false); }}>
          {children}
        </div>
      )}
    </div>
  );
}

const icon = (Icon) => <Icon size={16} strokeWidth={1.75} aria-hidden="true" />;

export default function PrintToolbar({
  title, setCode, syncState, prefs, onBack, onPaper, onDoc, onSolutions,
  editing, onToggleEdit, onPrint, printDisabled, printBusy, native, printHint,
  downloads, onTex, onMoreOpen, texBusy, onDrawNew, drawBusy, links, message,
}) {
  const docs = prefs.docs;
  return (
    <StickyToolbar className="ree-screen-only ree-toolbar">
      <div className="ree-toolbar-row">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            Back
          </Button>
          <h1 className="text-sm font-semibold text-textMain min-w-0 [overflow-wrap:anywhere]">{title}</h1>
          <span className="text-xs text-muted2 font-mono tabular-nums">{setCode}</span>
          <span role="status" className="text-xs text-muted2">{SYNC_TEXT[syncState] || SYNC_TEXT.saved}</span>
          <span aria-live="polite" className="text-xs text-textMain [overflow-wrap:anywhere]">{message}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" aria-pressed={editing} onClick={onToggleEdit}>
            {icon(Pencil)}
            Edit questions
          </Button>
          <MoreMenu onOpen={onMoreOpen}>
            <Button variant="ghost" size="sm" onClick={() => onTex(downloads ? 'download' : 'copy')} disabled={!!texBusy}>
              {downloads ? icon(Download) : icon(Copy)}
              {downloads ? 'Download .tex' : 'Copy .tex'}
            </Button>
            {downloads && (
              <Button variant="ghost" size="sm" onClick={() => onTex('overleaf')} disabled={!!texBusy}>
                {icon(ArrowUpRight)}
                Open in Overleaf
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onDrawNew} disabled={drawBusy}>
              {icon(Shuffle)}
              Draw a new set
            </Button>
            <Button as={Link} variant="ghost" size="sm" to={links.scan}>
              {icon(FileText)}
              Scan sheets
            </Button>
            <Button as={Link} variant="ghost" size="sm" to={links.results}>
              {icon(ListChecks)}
              Results
            </Button>
            {links.timer && (
              <Button as={Link} variant="ghost" size="sm" to={links.timer}>
                {icon(Timer)}
                Time this paper
              </Button>
            )}
          </MoreMenu>
          <Button size="sm" onClick={onPrint} disabled={printDisabled} loading={printBusy} aria-describedby={printHint ? 'ree-print-hint' : undefined}>
            {native ? 'Print in your browser' : 'Print'}
          </Button>
        </div>
      </div>
      <div className="ree-toolbar-row">
        <div className="flex flex-col gap-1 min-w-0">
          <SegmentedControl size="sm" label="Paper size" options={PAPER_OPTIONS} value={prefs.paper} onChange={onPaper} />
          {prefs.paper === 'long' && (
            <p className="text-xs text-muted2">Long bond is 8.5 {'\u00D7'} 13 in. If the print dialog asks, choose that size (some printers call it Folio).</p>
          )}
        </div>
        <fieldset className="ree-include">
          <legend className="text-eyebrow">Include</legend>
          {DOCUMENTS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-textMain cursor-pointer pointer-coarse:min-h-11">
              <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={!!docs[key]} onChange={(e) => onDoc(key, e.target.checked)} />
              {label}
            </label>
          ))}
          <label className={docs.key ? 'flex items-center gap-2 text-sm text-textMain cursor-pointer pointer-coarse:min-h-11' : 'flex items-center gap-2 text-sm text-muted2 pointer-coarse:min-h-11'}>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--accent)]"
              checked={!!(prefs.solutions && docs.key)}
              disabled={!docs.key}
              onChange={(e) => onSolutions(e.target.checked)}
            />
            Worked solutions
          </label>
        </fieldset>
      </div>
      {printHint && (
        <div className="ree-toolbar-row">
          <p id="ree-print-hint" className="text-xs text-muted2">{printHint}</p>
        </div>
      )}
    </StickyToolbar>
  );
}
