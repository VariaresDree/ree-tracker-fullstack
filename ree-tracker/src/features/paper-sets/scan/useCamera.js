// src/features/paper-sets/scan/useCamera.js
//
// The phone's rear camera for the scanner, through getUserMedia. The stream
// is held here, not by the <video>, so the viewfinder can come and go (the
// review screen, the result) while the camera stays on for the next sheet.
//
// It stops every track when the screen is left (unmount: a route change, or
// leaving the app's page), when the page is hidden (another app, the phone
// locked), and on pagehide; a page shown again restarts it if it was on.
//
// status: idle | starting | live | denied (permission refused) |
//   unavailable (no camera, or no getUserMedia) | error (it couldn't start)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { frameFromVideo } from './imageInput';

const CONSTRAINTS = {
  video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
  audio: false,
};

const DENIED = new Set(['NotAllowedError', 'SecurityError', 'PermissionDeniedError']);
const MISSING = new Set(['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError']);

export function cameraStatusFor(err) {
  const name = err?.name;
  if (DENIED.has(name)) return 'denied';
  if (MISSING.has(name)) return 'unavailable';
  return 'error';
}

/**
 * @returns {{
 *   attachVideo: (el: HTMLVideoElement|null) => void,  // the <video>'s callback ref
 *   status: string, start: () => Promise<void>, stop: () => void,
 *   capture: (maxSide: number) => ImageData|null,     // the current frame
 *   video: () => HTMLVideoElement|null,
 *   torch: { available: boolean, on: boolean, set: (on: boolean) => Promise<void> },
 * }}
 */
export function useCamera() {
  const streamRef = useRef(null);
  const videoEl = useRef(null);
  // Asked for by the screen (start) and not stopped since: restart on show.
  const wanted = useRef(false);
  const alive = useRef(true);
  const [status, setStatus] = useState('idle');
  const [torch, setTorchState] = useState({ available: false, on: false });

  const attach = useCallback((el) => {
    videoEl.current = el;
    if (!el) return;
    el.muted = true;
    el.playsInline = true;
    if (streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play?.()?.catch?.(() => {});
    }
  }, []);

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      try { t.stop(); } catch { /* already stopped */ }
    });
    streamRef.current = null;
    if (videoEl.current) videoEl.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    wanted.current = true;
    if (streamRef.current) return;
    const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!media?.getUserMedia) {
      setStatus('unavailable');
      return;
    }
    setStatus('starting');
    let stream;
    try {
      stream = await media.getUserMedia(CONSTRAINTS);
    } catch (err) {
      if (alive.current) setStatus(cameraStatusFor(err));
      return;
    }
    // Stopped, hidden or gone while the browser asked: give it back.
    if (!alive.current || !wanted.current || streamRef.current || document.visibilityState === 'hidden') {
      stream.getTracks().forEach((t) => t.stop());
      if (alive.current && wanted.current && !streamRef.current) setStatus('idle');
      return;
    }
    streamRef.current = stream;
    const el = videoEl.current;
    if (el) {
      el.srcObject = stream;
      el.play?.()?.catch?.(() => {});
    }
    const track = stream.getVideoTracks?.()[0];
    let caps;
    try { caps = track?.getCapabilities?.() || {}; } catch { caps = {}; }
    setTorchState({ available: !!caps.torch, on: false });
    track?.addEventListener?.('ended', () => {
      if (streamRef.current !== stream) return;
      release();
      if (alive.current) setStatus('idle');
    });
    setStatus('live');
  }, [release]);

  const stop = useCallback(() => {
    wanted.current = false;
    release();
    setStatus('idle');
    setTorchState({ available: false, on: false });
  }, [release]);

  useEffect(() => {
    alive.current = true;
    const pause = () => {
      if (!streamRef.current) return;
      release();
      setStatus('idle');
      setTorchState({ available: false, on: false });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') pause();
      else if (wanted.current && !streamRef.current) start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pause);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pause);
      alive.current = false;
      wanted.current = false;
      release();
    };
  }, [start, release]);

  const setTorch = useCallback(async (on) => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track?.applyConstraints) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !!on }] });
      setTorchState((t) => ({ ...t, on: !!on }));
    } catch {
      setTorchState({ available: false, on: false });
    }
  }, []);

  const capture = useCallback((maxSide) => frameFromVideo(videoEl.current, maxSide), []);
  const video = useCallback(() => videoEl.current, []);

  // One object per status, so the screens can depend on it.
  return useMemo(() => ({
    attachVideo: attach, status, start, stop, capture, video, torch: { ...torch, set: setTorch },
  }), [attach, status, start, stop, capture, video, torch, setTorch]);
}
