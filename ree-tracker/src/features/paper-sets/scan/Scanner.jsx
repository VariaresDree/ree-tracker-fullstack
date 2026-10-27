// src/features/paper-sets/scan/Scanner.jsx
//
// /scan and /scan/:setId: photograph answer sheets and score them, on the
// device. Full screen, outside the app shell, phone first.
//
//   1. The set: from the link, or chosen on /scan (or found by its QR code).
//   2. Whose sheet: a taker's (an examiner marking a class) or my own (a
//      self-check that goes into your history), from ?for=taker|self.
//   3. The picture: the live viewfinder takes it by itself once the sheet is
//      steady, or the shutter does; "Take a photo" and "Choose from gallery"
//      read a photo instead (the only way when the camera is blocked or
//      missing). A sheet of several pages is read page by page, in order.
//   4. Review: the rows the scanner wasn't sure of, corrections, the name.
//   5. The score, saved to the set (and, for a self-check, to your history).
//
// Photos never leave the device: the OMR engine (features/omr) reads them
// here, in a worker, and only the answers string and the name are saved.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { formatPrintId, outsideScoreErrors, scorePaperSheet, todayManila } from '@ree/shared';
import { Button, Card, SegmentedControl } from '../../../components/ui';
import {
  Camera, CameraOff, ChevronLeft, Flashlight, FlashlightOff, Images, ListChecks, ShieldCheck,
} from '../../../components/ui/icons';
import { createOmrClient, hintFor } from '../../omr/omrClient';
import { layoutHash } from '../../exam-export/sheetLayout';
import { newEntryId, useOutsideScores } from '../../exams/useOutsideScores';
import { usePrintedSet } from '../usePrintedSet';
import { useSetSheets } from '../useSetSheets';
import { useCamera } from './useCamera';
import { decodeImageFile } from './imageInput';
import { readQr } from './qrReader';
import {
  CAPTURE_SIDE, answersOf, firstSelfCheckId, mergePages, nextPage, progressLine, refusalReason, selfCheckEntry, selfCheckSubject,
} from './scanModel';
import Viewfinder from './Viewfinder';
import ReviewSheet from './ReviewSheet';
import ScanResult from './ScanResult';
import SetPicker from './SetPicker';

export const PRIVACY_LINE = 'Photos stay on this device. Only the answers and the name are saved.';
const WHO_OPTIONS = [
  { value: 'taker', label: 'A taker\u2019s sheet' },
  { value: 'self', label: 'My own sheet' },
];
const NAME_REQUIRED = 'Write the taker\u2019s name.';

const CAMERA_COPY = {
  denied: 'The camera is blocked for this site. To scan live, allow the camera in your browser\u2019s site settings. You can still take a photo of the sheet, or choose one from your gallery.',
  unavailable: 'No camera is available here. Take a photo of the sheet, or choose one from your gallery.',
  error: 'The camera couldn\u2019t start. Take a photo of the sheet, or choose one from your gallery.',
};

const SET_STATUS_COPY = {
  'not-found': ['This paper set isn\u2019t in your account', 'It may have been deleted, or it was made on another account.'],
  'offline-missing': ['This paper set isn\u2019t on this device yet', 'Connect to the internet to open it. Once it has opened here, it opens offline too.'],
  error: ['The paper set couldn\u2019t load', 'Try again in a moment.'],
};

function PhotoButtons({ onFile, disabled }) {
  const takeRef = useRef(null);
  const pickRef = useRef(null);
  const chosen = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onFile(file);
  };
  return (
    <div className="ree-scan-photo-row">
      <Button variant="secondary" onClick={() => takeRef.current?.click()} disabled={disabled}>
        <Camera size={16} strokeWidth={1.75} aria-hidden="true" />
        Take a photo
      </Button>
      <Button variant="secondary" onClick={() => pickRef.current?.click()} disabled={disabled}>
        <Images size={16} strokeWidth={1.75} aria-hidden="true" />
        Choose from gallery
      </Button>
      <input ref={takeRef} type="file" accept="image/*" capture="environment" hidden tabIndex={-1} onChange={chosen} />
      <input ref={pickRef} type="file" accept="image/*" hidden tabIndex={-1} onChange={chosen} />
    </div>
  );
}

/** Taking, reviewing and scoring sheets for one set. */
function ScanFlow({ set, draw, who, camera, sheetsApi }) {
  const outside = useOutsideScores();
  // The engine's worker, for as long as this screen is open, behind a stable
  // handle (the client is made in an effect, so React's development double
  // mount gets a fresh one rather than a closed one).
  const clientRef = useRef(null);
  useEffect(() => {
    const client = createOmrClient();
    clientRef.current = client;
    return () => {
      client.terminate();
      if (clientRef.current === client) clientRef.current = null;
    };
  }, []);
  const detect = useCallback((img, opts) => (clientRef.current
    ? clientRef.current.detect(img, opts)
    : Promise.reject(new Error('The scanner is starting.'))), []);
  const readWith = useCallback((img, opts) => (clientRef.current
    ? clientRef.current.read(img, opts)
    : Promise.reject(new Error('The scanner is starting.'))), []);
  const omr = useMemo(() => ({ detect, read: readWith }), [detect, readWith]);

  const itemCount = draw.items.length;
  const optionCounts = useMemo(() => draw.items.map((it) => (it.options || []).length), [draw.items]);
  const expectHash = useMemo(() => layoutHash(set.id, optionCounts), [set.id, optionCounts]);

  const [phase, setPhase] = useState('capture');
  const [reads, setReads] = useState({});
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [armKey, setArmKey] = useState(0);
  // Whether the viewfinder may take a steady sheet as soon as it opens: not
  // for the next sheet, while the one just scored is still under the phone.
  const [startArmed, setStartArmed] = useState(true);
  const [corrections, setCorrections] = useState({});
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(null);
  const today = todayManila();
  const [takenOn, setTakenOn] = useState(today);
  const [takenOnError, setTakenOnError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [result, setResult] = useState(null);
  const nameRef = useRef(null);
  const topRef = useRef(null);

  const readIndexes = useMemo(() => new Set(Object.keys(reads).map(Number)), [reads]);
  const pageCount = Object.values(reads)[0]?.page.count ?? null;
  const upNext = pageCount == null ? 0 : nextPage(readIndexes, pageCount);
  const ordered = useMemo(() => Object.values(reads).sort((a, b) => a.page.index - b.page.index), [reads]);
  const { rows } = useMemo(() => mergePages(ordered, itemCount), [ordered, itemCount]);

  // The camera runs while this screen is open, the review and result included,
  // so the next sheet is a moment away.
  const { start } = camera;
  useEffect(() => { start(); }, [start]);

  useEffect(() => {
    // The new screen's heading, so a screen reader starts there.
    if (phase !== 'capture') topRef.current?.querySelector('h2')?.focus?.();
  }, [phase]);

  /** Read one picture: a frame from the camera or a photo. */
  const readImage = useCallback(async (img) => {
    if (!img) return;
    setReading(true);
    setNotice(null);
    setArmKey((k) => k + 1);
    try {
      // The QR first: reading moves the pixels to the worker.
      const qr = await readQr(img).catch(() => null);
      const res = await omr.read(img, {
        printId: set.id,
        optionCounts,
        expectPage: upNext ?? 0,
        qrPrintId: qr?.printId,
        // 4 px/mm: the name box stays legible when cropped.
        reviewPpm: 4,
      });
      if (!res.ok) {
        const reason = refusalReason(res, readIndexes);
        const count = pageCount ?? res.page?.count ?? 0;
        const tail = count > 1 && (reason === 'wrong-page' || reason === 'duplicate-page') ? ` Scan page ${(upNext ?? 0) + 1}.` : '';
        setNotice({ tone: 'warn', text: `${hintFor(reason)}${tail}` });
        return;
      }
      const first = Object.values(reads)[0];
      if (first && first.page.paper !== res.page.paper) {
        setNotice({ tone: 'warn', text: 'This page was printed on another paper size. Scan the pages of one printing.' });
        return;
      }
      try { navigator.vibrate?.(30); } catch { /* not on this device */ }
      const next = { ...reads, [res.page.index]: res };
      setReads(next);
      const after = nextPage(new Set(Object.keys(next).map(Number)), res.page.count);
      if (after != null) {
        setNotice({ tone: 'ok', text: progressLine(res.page.index, res.page.count, after) });
      } else {
        setPhase('review');
      }
    } catch {
      setNotice({ tone: 'warn', text: 'The scanner stopped. Try again.' });
    } finally {
      setReading(false);
    }
  }, [omr, set.id, optionCounts, upNext, readIndexes, pageCount, reads]);

  const readFile = useCallback(async (file) => {
    setReading(true);
    setNotice(null);
    let img;
    try {
      img = await decodeImageFile(file, CAPTURE_SIDE);
    } catch {
      setReading(false);
      setNotice({ tone: 'warn', text: 'That file couldn\u2019t be opened as a photo. Try another one.' });
      return;
    }
    await readImage(img);
  }, [readImage]);

  /** Back to the camera: `nextSheet` for a new sheet, else the same one again. */
  const reset = ({ nextSheet = false } = {}) => {
    setStartArmed(!nextSheet);
    setReads({});
    setCorrections({});
    setName('');
    setNameError(null);
    setSaveError(null);
    setNotice(null);
    setResult(null);
    setTakenOn(today);
    setArmKey((k) => k + 1);
    setPhase('capture');
  };

  const score = async () => {
    const self = who === 'self';
    const takerName = name.trim();
    if (!self && !takerName) {
      setNameError(NAME_REQUIRED);
      nameRef.current?.focus();
      return;
    }
    setNameError(null);
    const answers = answersOf(rows, corrections, itemCount);
    const scored = scorePaperSheet({ items: draw.items, sections: draw.sections, profile: set.profile }, answers);
    const historyEntry = self && scored.scored > 0;
    if (historyEntry) {
      const problems = outsideScoreErrors({ title: 'x', takenOn, subject: 'ALL', score: 0, total: 1 }, today);
      if (problems.takenOn) {
        setTakenOnError(problems.takenOn);
        return;
      }
    }
    setTakenOnError(null);
    setSaving(true);
    setSaveError(null);

    const subject = selfCheckSubject(draw.sections);
    const outsideScoreId = historyEntry ? newEntryId() : null;
    const retestOfId = historyEntry ? firstSelfCheckId(sheetsApi.sheets, outside.items, subject) : null;
    const flagged = rows.filter((r) => r.status === 'unsure').map((r) => r.n);
    const sheet = {
      id: newEntryId(),
      takerName: self ? null : takerName,
      isSelf: self,
      answers,
      scannedAt: new Date().toISOString(),
      review: { corrected: Object.keys(corrections).map(Number).sort((a, b) => a - b), unsure: flagged },
      outsideScoreId,
    };
    let status;
    try {
      status = await sheetsApi.add(sheet);
    } catch (err) {
      setSaveError(err?.message ? `The sheet wasn\u2019t saved. ${err.message}` : 'The sheet wasn\u2019t saved. Try again.');
      setSaving(false);
      return;
    }
    let outsideError = null;
    if (historyEntry) {
      try {
        await outside.add(selfCheckEntry({ set, draw, score: scored, takenOn, id: outsideScoreId, retestOfId }));
      } catch (err) {
        outsideError = `The sheet is saved, but it couldn\u2019t be added to your history. ${err?.message || 'Try again later.'}`;
      }
    }
    setSaving(false);
    setResult({ score: scored, answers, status, outsideError, who, name: takerName, inHistory: historyEntry && !outsideError });
    setPhase('result');
  };

  const counted = (sheetsApi.sheets || []).length;
  const resultsTo = `/exams/paper-sets/${set.id}`;
  const cameraProblem = CAMERA_COPY[camera.status];

  return (
    <>
      {phase === 'capture' && (
        <div className="ree-scan-capture">
          {cameraProblem ? (
            <Card padding="md" className="flex items-start gap-3">
              <CameraOff size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5 text-muted2" />
              <p className="text-sm text-textMain">{cameraProblem}</p>
            </Card>
          ) : (
            <Viewfinder
              cameraStatus={camera.status}
              attachVideo={camera.attachVideo}
              capture={camera.capture}
              omr={omr}
              active={phase === 'capture'}
              expectHash={expectHash}
              readPages={readIndexes}
              nextPageIndex={upNext}
              armKey={armKey}
              startArmed={startArmed}
              reading={reading}
              onCapture={readImage}
            />
          )}
          {notice && (
            <p role="status" className={notice.tone === 'warn' ? 'ree-scan-notice ree-scan-notice-warn' : 'ree-scan-notice'}>
              {notice.text}
            </p>
          )}
          {cameraProblem && reading && <p role="status" className="ree-scan-notice">Reading the sheet{'\u2026'}</p>}
          <PhotoButtons onFile={readFile} disabled={reading} />
          <p className="text-xs text-muted2">
            {pageCount > 1
              ? `This answer sheet has ${pageCount} pages. Scan them in order, page 1 first.`
              : 'Lay the sheet flat in good light, with all four black squares in view.'}
          </p>
        </div>
      )}

      {phase === 'review' && (
        <div ref={topRef} className="ree-scan-wide">
          <ReviewSheet
            set={set}
            draw={draw}
            reads={ordered}
            rows={rows}
            corrections={corrections}
            onCorrect={(n, ch) => setCorrections((c) => ({ ...c, [n]: ch }))}
            who={who}
            name={name}
            onName={(v) => { setName(v); if (nameError && v.trim()) setNameError(null); }}
            nameError={nameError}
            nameRef={nameRef}
            takenOn={takenOn}
            onTakenOn={setTakenOn}
            takenOnError={takenOnError}
            today={today}
            onScore={score}
            saving={saving}
            saveError={saveError}
            onRescan={() => reset()}
          />
        </div>
      )}

      {phase === 'result' && result && (
        <div ref={topRef}>
          <ScanResult draw={draw} result={result} onNext={() => reset({ nextSheet: true })} resultsTo={resultsTo} />
        </div>
      )}

      {phase === 'capture' && counted > 0 && (
        <p className="text-sm text-muted2">
          {`${counted === 1 ? '1 sheet' : `${counted} sheets`} scanned for this set. `}
          <Link to={resultsTo} className="text-[var(--accent-text)] underline underline-offset-2">See results</Link>
        </p>
      )}
    </>
  );
}

function SetStatus({ status, onBack }) {
  if (status === 'loading') return <p role="status" className="text-sm text-muted2">Opening the paper set{'\u2026'}</p>;
  const [title, body] = SET_STATUS_COPY[status] || SET_STATUS_COPY.error;
  return (
    <Card padding="md" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-textMain">{title}</h2>
      <p className="text-sm text-muted2">{body}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onBack}>Back</Button>
        <Button as={Link} variant="secondary" to="/exams?tab=paper">Paper sets</Button>
      </div>
    </Card>
  );
}

function SetScan({ setId, who, camera, onBack, onSet }) {
  const ps = usePrintedSet(setId);
  const sheetsApi = useSetSheets(setId);
  const ready = ps.status === 'ready' && ps.set && ps.draw;
  useEffect(() => { onSet(ready ? ps.set : null); }, [ready, ps.set, onSet]);
  if (!ready) return <SetStatus status={ps.status} onBack={onBack} />;
  return <ScanFlow set={ps.set} draw={ps.draw} who={who} camera={camera} sheetsApi={sheetsApi} />;
}

/**
 * @param {{ setId: string|null, badId?: boolean }} props  setId: a normalised print id
 */
export default function Scanner({ setId, badId = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const who = params.get('for') === 'self' ? 'self' : 'taker';
  const camera = useCamera();
  const [set, setSet] = useState(null);

  const setWho = (value) => {
    const next = new URLSearchParams(params);
    next.set('for', value);
    setParams(next, { replace: true });
  };

  // Back to where the scanner was opened from, or to Paper sets when it was
  // opened on its own (a link, a bookmark), where Back would leave the app.
  const back = () => {
    const idx = window.history.state?.idx;
    const canGoBack = typeof idx === 'number' ? idx > 0 : location.key !== 'default';
    if (canGoBack) navigate(-1);
    else navigate('/exams?tab=paper', { replace: true });
  };

  const torch = camera.torch;
  return (
    <main className="ree-scan">
      <header className="ree-scan-bar">
        <Button variant="ghost" size="sm" onClick={back}>
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-textMain">Scan answer sheets</h1>
          {set && (
            <p className="text-xs text-muted2 [overflow-wrap:anywhere]">
              {`${set.label} \u00B7 ${set.title} \u00B7 `}
              <span className="font-mono tabular-nums">{formatPrintId(set.id)}</span>
            </p>
          )}
        </div>
        {set && (
          <Button as={Link} variant="ghost" size="sm" to={`/exams/paper-sets/${set.id}`}>
            <ListChecks size={16} strokeWidth={1.75} aria-hidden="true" />
            Results
          </Button>
        )}
        {torch.available && (
          <Button variant="ghost" size="icon" aria-pressed={torch.on} aria-label="Light" onClick={() => torch.set(!torch.on)}>
            {torch.on
              ? <FlashlightOff size={18} strokeWidth={1.75} aria-hidden="true" />
              : <Flashlight size={18} strokeWidth={1.75} aria-hidden="true" />}
          </Button>
        )}
      </header>

      <SegmentedControl label="Whose sheet is this?" options={WHO_OPTIONS} value={who} onChange={setWho} fullWidth />
      <p className="ree-scan-privacy">
        <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
        {PRIVACY_LINE}
      </p>

      {setId ? (
        <SetScan setId={setId} who={who} camera={camera} onBack={back} onSet={setSet} />
      ) : badId ? (
        <SetStatus status="not-found" onBack={back} />
      ) : (
        <SetPicker
          who={who}
          cameraStatus={camera.status}
          attachVideo={camera.attachVideo}
          startCamera={camera.start}
          video={camera.video}
        />
      )}
    </main>
  );
}
