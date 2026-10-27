// src/features/paper-sets/print/PrintPreview.jsx
//
// /print/:setId: a printed set's real pages, typeset by the app's own KaTeX
// renderer, printed with the browser's Print (Save as PDF works too).
//
// Everything renders in a portal, `.ree-print-root`, on <body>: printing
// hides the rest of the app (print.css) and leaves only the sheets, with the
// page size injected per paper (`@page { size: W H; margin: 0 }`, which also
// drops the browser's URL and date lines). Pages are laid out in JS from
// measured heights (paginate.js), so the preview is what prints and each
// sheet numbers itself.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatPrintId } from '@ree/shared';
import { Button, Card, Modal } from '../../../components/ui';
import { Shuffle, TriangleAlert, X } from '../../../components/ui/icons';
import { paperSize } from '../../exam-export/sheetLayout';
import { drawWarningLines } from '../../exam-export/drawExamPaper';
import { canDownloadFiles, copyText, downloadBlob } from '../../exam-export/deliver';
import { sheetGeometryFor } from '../paperText';
import { DOCUMENT_KEYS, PAPERS, isUnusedSet } from '../printedSetModel';
import { createPrintedSetFromConfig, deletePrintedSet } from '../printedSetsApi';
import { usePrintedSet } from '../usePrintedSet';
import { packColumns, mmToPx, pageBox } from './paginate';
import { useMeasuredPages } from './useMeasuredPages';
import { Masthead, QuestionPaperPages } from './QuestionPaper';
import { AnswerKeyPages } from './AnswerKey';
import { AnswerSheetPages } from './AnswerSheet';
import { answerKeyBlocks, questionPaperBlocks } from './blocks';
import {
  BROKEN_FORMULA, ITEM_GAP_MM, KEY_GAP_MM, MASTHEAD_GAP_MM, MASTHEAD_KEY, brokenFormulaLine,
} from './layout';
import { useQrModules } from './qr';
import { buildSetTex, buildSetTexNow, openInOverleaf, prepareTex } from './texExport';
import PrintToolbar from './PrintToolbar';
import ItemEditor from './ItemEditor';

const APP_URL = import.meta.env.VITE_PUBLIC_APP_URL || 'https://ree-tracker.vercel.app';

/** The Android app (Capacitor) prints nothing itself: it opens the browser. */
function isNativeApp() {
  return !canDownloadFiles();
}

/** The portal on <body>, and the page-level class print.css keys on. */
function usePrintRoot() {
  const [root] = useState(() => {
    const el = document.createElement('div');
    el.className = 'ree-print-root';
    return el;
  });
  useLayoutEffect(() => {
    document.body.appendChild(root);
    document.documentElement.classList.add('ree-printing-page');
    return () => {
      root.remove();
      document.documentElement.classList.remove('ree-printing-page');
    };
  }, [root]);
  return root;
}

/** `@page` for the chosen paper: its size, and no browser margins. */
function usePageSizeRule({ w, h }) {
  useEffect(() => {
    const el = document.getElementById('ree-page-size') || document.createElement('style');
    el.id = 'ree-page-size';
    el.textContent = `@page { size: ${w}mm ${h}mm; margin: 0 }`;
    document.head.appendChild(el);
    return () => el.remove();
  }, [w, h]);
}

/** Sheets narrower than the screen, on a phone: 16 px either side. */
function useSheetScale(widthMm) {
  const read = () => document.documentElement.clientWidth || window.innerWidth || 1024;
  const [vw, setVw] = useState(read);
  useEffect(() => {
    const onResize = () => setVw(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return Math.min(1, Math.max(0.2, (vw - 32) / mmToPx(widthMm)));
}

function normalPrefs(prefs) {
  const docs = prefs?.docs || {};
  return {
    paper: PAPERS.includes(prefs?.paper) ? prefs.paper : 'a4',
    docs: Object.fromEntries(DOCUMENT_KEYS.map((k) => [k, docs[k] !== false])),
    solutions: prefs?.solutions !== false,
  };
}

const STATUS_COPY = {
  'not-found': ['This paper set isn\u2019t in your account', 'It may have been deleted, or it was made on another account.'],
  'offline-missing': ['This paper set isn\u2019t on this device yet', 'Connect to the internet to open it. Once it has opened here, it opens offline too.'],
  error: ['The paper set couldn\u2019t load', 'Try again in a moment.'],
};

function StatusScreen({ status, onBack }) {
  if (status === 'loading') {
    return <p role="status" className="ree-print-status text-sm text-muted2">Opening the paper{'\u2026'}</p>;
  }
  const [title, body] = STATUS_COPY[status] || STATUS_COPY.error;
  return (
    <div className="ree-print-status">
      <Card padding="lg" className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-textMain">{title}</h1>
        <p className="text-sm text-muted2">{body}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onBack}>Back to Exams</Button>
          {status === 'error' && <Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button>}
        </div>
      </Card>
    </div>
  );
}

function Preview({ ps, onBack }) {
  const navigate = useNavigate();
  const { set, draw } = ps;
  const prefs = normalPrefs(set.prefs);
  const { docs } = prefs;
  const size = paperSize(prefs.paper);
  const box = pageBox(size, 2);
  const setCode = formatPrintId(set.id);
  const plan = draw.plan || {};
  const footerLeft = ['REE Pre-board', plan.code, draw.setLabel, `Set code ${setCode}`].filter(Boolean).join(' \u00B7 ');
  const native = isNativeApp();
  const downloads = !native;

  const [editing, setEditing] = useState(false);
  const [editingN, setEditingN] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [texBusy, setTexBusy] = useState(null);
  const [drawBusy, setDrawBusy] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [message, setMessage] = useState('');
  const [hideNotice, setHideNotice] = useState(false);
  const scale = useSheetScale(size.w);
  usePageSizeRule(size);

  // The blocks: once for the sheets (items are edit buttons in edit mode),
  // once plain for measuring.
  const onEdit = editing ? setEditingN : undefined;
  const paperBlocks = useMemo(() => questionPaperBlocks(draw, { onEdit }), [draw, onEdit]);
  const plainPaperBlocks = useMemo(() => questionPaperBlocks(draw), [draw]);
  const keyBlocks = useMemo(
    () => answerKeyBlocks(draw, { solutions: prefs.solutions, setCode }),
    [draw, prefs.solutions, setCode],
  );

  const groups = [];
  if (docs.paper) {
    groups.push({ id: 'mast', widthMm: box.contentW, blocks: [{ key: MASTHEAD_KEY, node: <Masthead draw={draw} /> }] });
    groups.push({ id: 'items', widthMm: box.colW, blocks: plainPaperBlocks });
  }
  if (docs.key) groups.push({ id: 'key', widthMm: box.contentW, blocks: keyBlocks });
  const version = [prefs.paper, docs.paper, docs.key, prefs.solutions, draw.keyVersion, JSON.stringify(set.edits || {})].join('|');
  const { heights, current, layer } = useMeasuredPages(groups, version);

  const paperLayout = useMemo(() => {
    if (!heights || !docs.paper) return null;
    const { pages, oversize } = packColumns(
      plainPaperBlocks.map((b) => ({ key: b.key, h: heights[b.key] || 0, keepWithNext: b.keepWithNext })),
      {
        firstColH: mmToPx(box.contentH - MASTHEAD_GAP_MM) - (heights[MASTHEAD_KEY] || 0),
        colH: mmToPx(box.contentH),
        cols: 2,
        gap: mmToPx(ITEM_GAP_MM),
      },
    );
    return { pages, oversize, heights };
  }, [heights, docs.paper, plainPaperBlocks, box.contentH]);

  const keyLayout = useMemo(() => {
    if (!heights || !docs.key) return null;
    const { pages, oversize } = packColumns(
      keyBlocks.map((b) => ({ key: b.key, h: heights[b.key] || 0, keepWithNext: b.keepWithNext })),
      { firstColH: mmToPx(box.contentH), colH: mmToPx(box.contentH), cols: 1, gap: mmToPx(KEY_GAP_MM) },
    );
    return { pages, oversize, heights };
  }, [heights, docs.key, keyBlocks, box.contentH]);

  const nodes = useMemo(() => new Map([...paperBlocks, ...keyBlocks].map((b) => [b.key, b.node])), [paperBlocks, keyBlocks]);
  const render = useCallback((key) => nodes.get(key) ?? null, [nodes]);

  // The one geometry the LaTeX sheet and the scanner use too, text included.
  const geometry = useMemo(
    () => sheetGeometryFor(draw, { paper: prefs.paper, printId: set.id, setCode }),
    [draw, prefs.paper, set.id, setCode],
  );
  const qr = useQrModules(docs.sheet ? geometry.pages.map((p) => p.qr.payload) : []);

  const nothing = !docs.paper && !docs.sheet && !docs.key;
  const laidOut = !!heights && current && (!docs.sheet || qr.ready);
  const printHint = native && ps.createQueued ? 'Connect to the internet first: the set must reach your account before the browser can open it.' : null;

  const print = async () => {
    if (native) {
      window.location.href = `${APP_URL}/print/${set.id}`;
      return;
    }
    setPrinting(true);
    try {
      await (document.fonts?.ready || Promise.resolve());
      window.print();
      ps.markPrinted();
    } finally {
      setPrinting(false);
    }
  };

  const tex = async (mode) => {
    setMessage('');
    // Overleaf: built and posted inside the click when the writer is ready
    // (it loads as More opens), so the new tab isn't blocked as a pop-up.
    if (mode === 'overleaf') {
      try {
        const now = buildSetTexNow(draw, prefs);
        if (now) {
          openInOverleaf(now);
          setMessage('Opened in Overleaf, in a new tab.');
          return;
        }
      } catch (err) {
        setMessage(err?.message || 'The LaTeX file couldn\u2019t be made.');
        return;
      }
    }
    setTexBusy(mode);
    try {
      const file = await buildSetTex(draw, prefs);
      if (mode === 'overleaf') {
        openInOverleaf(file);
        setMessage('Opened in Overleaf, in a new tab.');
      } else if (mode === 'copy') {
        const ok = await copyText(file.content);
        setMessage(ok ? `Copied ${file.name}.` : `Couldn\u2019t copy ${file.name}.`);
      } else {
        downloadBlob(new Blob([file.content], { type: 'application/x-tex' }), file.name);
        setMessage(`Downloaded ${file.name}.`);
      }
    } catch (err) {
      setMessage(err?.message || 'The LaTeX file couldn\u2019t be made.');
    } finally {
      setTexBusy(null);
    }
  };

  // A new set from the same setup. This one is deleted when nothing has
  // happened to it yet; kept otherwise (asking first when it has sheets).
  const drawNew = async (confirmed = false) => {
    if (ps.sheetCount > 0 && !confirmed) {
      setConfirmNew(true);
      return;
    }
    setConfirmNew(false);
    setDrawBusy(true);
    setMessage('Drawing a new set\u2026');
    try {
      const unused = isUnusedSet(set, ps.sheetCount);
      const { set: next } = await createPrintedSetFromConfig(set.config || {});
      navigate(`/print/${next.id}`, { replace: true });
      if (unused) deletePrintedSet(set.id).catch(() => {});
    } catch (err) {
      setMessage(err?.message || 'A new set couldn\u2019t be drawn.');
      setDrawBusy(false);
    }
  };

  // Items whose formula doesn't render, read off the pages as laid out.
  const sheetsRef = useRef(null);
  const [brokenItems, setBrokenItems] = useState('');
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const ns = new Set();
      sheetsRef.current?.querySelectorAll(BROKEN_FORMULA).forEach((el) => {
        const n = Number(el.closest('[data-item]')?.getAttribute('data-item'));
        if (n) ns.add(n);
      });
      setBrokenItems([...ns].sort((a, b) => a - b).join(','));
    });
    return () => cancelAnimationFrame(frame);
  }, [paperLayout, keyLayout, draw]);

  const brokenLine = brokenFormulaLine(brokenItems ? brokenItems.split(',').map(Number) : []);
  const warnings = [...(brokenLine ? [brokenLine] : []), ...drawWarningLines(draw)];
  const timeable = plan.kind === 'subject' && plan.profile === 'prc_subject' && draw.sections?.[0]?.subject;
  const links = {
    scan: `/scan/${set.id}`,
    results: `/exams/paper-sets/${set.id}`,
    timer: timeable ? `/focus?mode=exam&section=${encodeURIComponent(draw.sections[0].subject)}` : null,
  };
  const editingItem = editingN != null ? draw.items.find((it) => it.n === editingN) : null;
  const originalItem = editingN != null ? (set.items || []).find((it) => it.n === editingN) : null;

  return (
    <>
      <div className="ree-print-screen ree-screen-only">
        <PrintToolbar
          title={`${draw.setLabel} \u00B7 ${plan.title || 'Exam paper'}`}
          setCode={setCode}
          syncState={ps.syncState}
          prefs={prefs}
          onBack={onBack}
          onPaper={(paper) => ps.setPrefs({ paper })}
          onDoc={(key, on) => ps.setPrefs({ docs: { [key]: on } })}
          onSolutions={(on) => ps.setPrefs({ solutions: on })}
          editing={editing}
          onToggleEdit={() => setEditing((e) => !e)}
          onPrint={print}
          printBusy={printing}
          printDisabled={nothing || printing || (native ? ps.createQueued : !laidOut)}
          native={native}
          printHint={printHint}
          downloads={downloads}
          onTex={tex}
          onMoreOpen={() => { prepareTex().catch(() => {}); }}
          texBusy={texBusy}
          onDrawNew={() => drawNew(false)}
          drawBusy={drawBusy}
          links={links}
          message={message}
        />
        {ps.error && <p role="alert" className="ree-print-notice text-sm text-[var(--accent-danger)]">{ps.error}</p>}
        {warnings.length > 0 && !hideNotice && (
          <div className="ree-print-notice flex items-start gap-2 p-3 rounded-[var(--radius-default)] border bg-surface2 text-sm text-textMain" style={{ borderColor: 'color-mix(in srgb, var(--color-reeAmber) 45%, transparent)' }}>
            <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5 text-reeAmber-text" />
            <ul className="flex-1 min-w-0 flex flex-col gap-1">
              {warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
            <Button variant="ghost" size="icon" aria-label="Dismiss these notes" onClick={() => setHideNotice(true)}>
              <X size={16} strokeWidth={1.75} aria-hidden="true" />
            </Button>
          </div>
        )}
        {editing && <p className="ree-print-notice text-sm text-muted2">Choose a question to edit it. Your changes apply to this set only.</p>}
        {nothing && <p className="ree-print-notice text-sm text-muted2">Choose at least one document to include.</p>}
        {!laidOut && !nothing && <p className="ree-print-notice text-sm text-muted2">Laying out the pages{'\u2026'}</p>}
      </div>

      <div className="ree-sheets" ref={sheetsRef}>
        {docs.paper && paperLayout && (
          <QuestionPaperPages draw={draw} layout={paperLayout} size={size} scale={scale} footerLeft={footerLeft} render={render} />
        )}
        {docs.sheet && <AnswerSheetPages geometry={geometry} scale={scale} modules={qr.modules} />}
        {docs.key && keyLayout && (
          <AnswerKeyPages layout={keyLayout} size={size} scale={scale} footerLeft={footerLeft} render={render} />
        )}
      </div>
      {layer}

      {editingItem && originalItem && (
        <ItemEditor
          key={editingItem.n}
          item={editingItem}
          original={originalItem}
          sheetCount={ps.sheetCount}
          onSave={(edit) => {
            ps.saveEdit(editingItem.n, edit);
            setEditingN(null);
          }}
          onClose={() => setEditingN(null)}
        />
      )}

      <Modal
        open={confirmNew}
        onClose={() => setConfirmNew(false)}
        tone="amber"
        icon={Shuffle}
        title="Draw a new set?"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmNew(false)}>Cancel</Button>
            <Button tone="amber" onClick={() => drawNew(true)}>Draw a new set</Button>
          </>
        )}
      >
        <p className="text-sm text-muted2">
          {ps.sheetCount === 1 ? '1 answer sheet is' : `${ps.sheetCount} answer sheets are`} already scanned for this set.
          It stays in Paper sets with its results; the new set gets questions and a code of its own.
        </p>
      </Modal>
    </>
  );
}

export default function PrintPreview({ setId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const root = usePrintRoot();
  const ps = usePrintedSet(setId);

  // Back to the page the preview was opened from, or to Exams when it was
  // opened on its own (a link, a bookmark, the phone's browser), where Back
  // would leave the app. The router's own history index says which.
  const back = () => {
    const idx = window.history.state?.idx;
    const canGoBack = typeof idx === 'number' ? idx > 0 : location.key !== 'default';
    if (canGoBack) navigate(-1);
    else navigate('/exams', { replace: true });
  };

  const content = ps.status === 'ready' && ps.set && ps.draw
    ? <Preview ps={ps} onBack={back} />
    : <StatusScreen status={setId ? ps.status : 'not-found'} onBack={back} />;
  return createPortal(content, root);
}
