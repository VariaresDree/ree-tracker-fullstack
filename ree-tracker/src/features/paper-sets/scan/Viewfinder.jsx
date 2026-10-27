// src/features/paper-sets/scan/Viewfinder.jsx
//
// The live camera with a guide frame. About every 150 ms the current frame,
// scaled to 640 px, goes to the OMR engine's quick check (`detect`), one at
// a time. Each corner bracket turns to the accent colour as a corner square
// is found near it, and the sheet's outline is drawn once all four are. When
// the sheet has held still for six checks in a row, the full frame (up to
// 2400 px) is taken and read, and the phone buzzes; the shutter takes it at
// once.
//
// After a picture is taken it won't take another of the same sheet by
// itself: the sheet has to leave the frame first, or (for a sheet of several
// pages) a page not yet read has to come into it. The same holds when it
// opens again for the next sheet (`startArmed` false): the sheet just scored
// is usually still under the phone.
//
// The status line is polite and changes at most every 0.7 s, so a screen
// reader isn't flooded. The video and its overlay are hidden from assistive
// technology: the status line says everything they show.
import { useCallback, useEffect, useRef, useState } from 'react';
import { REASON_HINTS } from '../../omr/reasons';
import { Button } from '../../../components/ui';
import { Camera } from '../../../components/ui/icons';
import {
  CAPTURE_SIDE, LIVE_SIDE, VIEW_TEXT, cornerLocks, guideRect, steadyLock,
} from './scanModel';

const TICK_MS = 150;
const SAY_EVERY_MS = 700;

/** The L-shaped bracket at a guide corner, pointing into the frame. */
function bracket(c, dx, dy, len) {
  return `M ${c.x + dx * len} ${c.y} L ${c.x} ${c.y} L ${c.x} ${c.y + dy * len}`;
}

/**
 * @param {{
 *   cameraStatus: string, attachVideo: (el) => void, capture: (maxSide: number) => ImageData|null,
 *   omr: object|null, active: boolean, expectHash: string, readPages: Set<number>,
 *   nextPageIndex: number|null, armKey: number, startArmed?: boolean, reading: boolean,
 *   onCapture: (img: ImageData, how: 'auto'|'shutter') => Promise<void>,
 * }} props  the camera from useCamera, the engine from createOmrClient
 */
export default function Viewfinder({
  cameraStatus, attachVideo, capture, omr, active, expectHash, readPages, nextPageIndex, armKey, startArmed = true, reading, onCapture,
}) {
  const [view, setView] = useState({ w: 480, h: 640, result: null });
  const [line, setLine] = useState(VIEW_TEXT.fit);
  const lineRef = useRef({ text: VIEW_TEXT.fit, at: 0 });
  const history = useRef([]);
  const armed = useRef(startArmed);
  const lost = useRef(0);
  const capturing = useRef(false);
  const latest = useRef({});
  useEffect(() => {
    latest.current = { expectHash, readPages, nextPageIndex, reading, onCapture };
  });

  // A new arm key (a picture taken, or the next taker): wait for the sheet to
  // leave the frame, or for a page not read yet.
  const firstKey = useRef(armKey);
  useEffect(() => {
    if (armKey === firstKey.current) return;
    armed.current = false;
    lost.current = 0;
    history.current = [];
  }, [armKey]);

  const say = useCallback((text, now = false) => {
    const cur = lineRef.current;
    if (text === cur.text) return;
    const t = Date.now();
    if (!now && t - cur.at < SAY_EVERY_MS) return;
    lineRef.current = { text, at: t };
    setLine(text);
  }, []);

  const take = useCallback(async (how) => {
    if (capturing.current || latest.current.reading) return;
    const full = capture(CAPTURE_SIDE);
    if (!full) return;
    capturing.current = true;
    armed.current = false;
    history.current = [];
    say(VIEW_TEXT.reading, true);
    try {
      await latest.current.onCapture?.(full, how);
    } finally {
      capturing.current = false;
    }
  }, [capture, say]);

  const handle = useCallback((r, w, h) => {
    const { expectHash: hash, readPages: done, nextPageIndex: next } = latest.current;
    history.current = [...history.current.slice(-9), r];
    const seen = !!(r && (r.found || r.quad));
    if (!seen) {
      lost.current += 1;
      if (lost.current >= 3) armed.current = true;
    } else {
      lost.current = 0;
    }
    const page = r?.page || null;
    const wrongSet = !!(page && hash && page.hash !== hash);
    const alreadyRead = !!(page && !wrongSet && done?.has(page.index));
    // Another page of this sheet, not read yet: ready to take it.
    if (page && !wrongSet && !alreadyRead && done?.size) armed.current = true;
    setView({ w, h, result: r });

    if (latest.current.reading || capturing.current) return;
    let text;
    if (!r || (!seen && !(r.squares || []).length)) text = VIEW_TEXT.fit;
    else if (wrongSet) text = REASON_HINTS['wrong-set'];
    else if (alreadyRead) text = next != null ? `This page is already read. Now scan page ${next + 1}.` : REASON_HINTS['duplicate-page'];
    else if (!r.found) text = r.reason && r.reason !== 'no-sheet' ? REASON_HINTS[r.reason] : VIEW_TEXT.fit;
    else text = VIEW_TEXT.hold;
    say(text);

    if (!wrongSet && !alreadyRead && armed.current && steadyLock(history.current, { diag: Math.hypot(w, h) })) take('auto');
  }, [say, take]);

  const live = active && cameraStatus === 'live' && !!omr;
  useEffect(() => {
    if (!live) return undefined;
    let stopped = false;
    let timer = null;
    const tick = async () => {
      if (stopped) return;
      if (!capturing.current && !latest.current.reading) {
        const frame = capture(LIVE_SIDE);
        if (frame) {
          const { width, height } = frame;
          let r;
          try {
            r = await omr.detect(frame);
          } catch {
            r = null;
          }
          if (stopped) return;
          handle(r, width, height);
        }
      }
      if (!stopped) timer = setTimeout(tick, TICK_MS);
    };
    timer = setTimeout(tick, TICK_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [live, capture, omr, handle]);

  const { w, h, result } = view;
  const g = guideRect(w, h);
  const corners = [{ x: g.x, y: g.y }, { x: g.x + g.w, y: g.y }, { x: g.x + g.w, y: g.y + g.h }, { x: g.x, y: g.y + g.h }];
  const points = result?.quad || result?.squares || [];
  const locks = live ? cornerLocks(corners, points, 0.2 * Math.min(w, h)) : [false, false, false, false];
  const len = 0.08 * Math.min(w, h);
  const stroke = Math.max(2, 0.012 * Math.min(w, h));
  const dirs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  const quad = live && result?.quad ? result.quad.map((p) => `${p.x},${p.y}`).join(' ') : null;

  let shown = line;
  if (reading) shown = VIEW_TEXT.reading;
  else if (cameraStatus === 'starting') shown = VIEW_TEXT.starting;
  else if (cameraStatus === 'idle') shown = VIEW_TEXT.paused;

  return (
    <div className="ree-scan-finder">
      <div className="ree-scan-frame" aria-hidden="true">
        <video ref={attachVideo} autoPlay playsInline muted />
        <svg className="ree-scan-overlay" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
          {quad && (
            <polygon
              points={quad}
              fill="none"
              stroke={result.found ? 'var(--accent)' : 'rgb(255 255 255 / 0.7)'}
              strokeWidth={stroke * 0.6}
              strokeDasharray={result.found ? undefined : `${stroke * 2} ${stroke * 2}`}
            />
          )}
          {corners.map((c, i) => (
            <path
              key={i}
              d={bracket(c, dirs[i][0], dirs[i][1], len)}
              fill="none"
              stroke={locks[i] ? 'var(--accent)' : 'rgb(255 255 255 / 0.9)'}
              strokeWidth={stroke}
              strokeLinecap="round"
              data-locked={locks[i] ? 'true' : 'false'}
            />
          ))}
        </svg>
      </div>
      <p role="status" aria-live="polite" className="ree-scan-status">{shown}</p>
      <div className="ree-scan-shutter-row">
        <Button
          size="icon"
          className="ree-scan-shutter"
          onClick={() => take('shutter')}
          disabled={!live || reading}
          aria-label="Take the picture now"
        >
          <Camera size={24} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
