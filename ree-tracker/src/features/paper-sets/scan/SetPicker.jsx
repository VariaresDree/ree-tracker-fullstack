// src/features/paper-sets/scan/SetPicker.jsx
//
// /scan with no set in the link: choose one of your paper sets, or, where the
// browser can read QR codes, point the camera at the sheet's QR code and the
// set opens by itself. The camera is only asked for when it can do that.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrintId } from '@ree/shared';
import { Button, Card, EmptyState, Skeleton } from '../../../components/ui';
import { FileText, QrCode } from '../../../components/ui/icons';
import { usePrintedSets } from '../usePrintedSets';
import { qrDetector, readQr } from './qrReader';

const QR_EVERY_MS = 400;
const sheetsLine = (n) => (n === 1 ? '1 sheet scanned' : `${n} sheets scanned`);

/** @param {{ who: 'self'|'taker', cameraStatus, attachVideo, startCamera, video }} props  from useCamera */
export default function SetPicker({ who, cameraStatus, attachVideo, startCamera, video }) {
  const navigate = useNavigate();
  const { sets, status } = usePrintedSets();
  const [qr, setQr] = useState(false);

  // The QR route needs both a detector and the camera.
  useEffect(() => {
    let live = true;
    qrDetector().then((d) => {
      if (!live || !d) return;
      setQr(true);
      startCamera();
    });
    return () => { live = false; };
  }, [startCamera]);

  const live = qr && cameraStatus === 'live';
  useEffect(() => {
    if (!live) return undefined;
    let stopped = false;
    let timer = null;
    const tick = async () => {
      const found = await readQr(video());
      if (stopped) return;
      if (found) {
        navigate(`/scan/${found.printId}?for=${who}`);
        return;
      }
      timer = setTimeout(tick, QR_EVERY_MS);
    };
    timer = setTimeout(tick, QR_EVERY_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [live, video, navigate, who]);

  const list = sets || [];
  return (
    <section className="flex flex-col gap-3" aria-labelledby="ree-pick-title">
      <h2 id="ree-pick-title" className="text-lg font-semibold text-textMain">Which paper set?</h2>
      {qr && (
        <div className="flex flex-col gap-2">
          <div className="ree-scan-frame ree-scan-frame-qr" aria-hidden="true">
            <video ref={attachVideo} autoPlay playsInline muted />
          </div>
          <p role="status" className="ree-scan-status">
            <QrCode size={16} strokeWidth={1.75} aria-hidden="true" />
            {' Point the camera at the QR code on the answer sheet, or choose the set below.'}
          </p>
        </div>
      )}
      {sets == null && status === 'loading' ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          compact
          icon={FileText}
          title="No paper sets yet"
          description="Print a paper from the mock board setup first. Its answer sheets can be scanned here."
          action={<Button as={Link} to="/simulator" size="sm">Print a new paper</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((s) => (
            <li key={s.id}>
              <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-textMain [overflow-wrap:anywhere]">{`${s.label} \u00B7 ${s.title}`}</p>
                  <p className="text-xs text-muted2 tabular-nums">
                    {`${formatPrintId(s.id)} \u00B7 ${sheetsLine(s._count?.sheets ?? 0)}`}
                  </p>
                </div>
                <Button as={Link} size="sm" to={`/scan/${s.id}?for=${who}`}>
                  {'Scan '}
                  <span className="sr-only">{`${s.label}, ${s.title}`}</span>
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
