// src/features/profile/CredentialsTab.jsx
//
// Account › Achievements: the readiness certificate, unlocked at a Board
// Readiness Index of 70 — the same composite the Today card shows
// (/api/readiness). It used to fall back to an ability-only (θ+3)/6 figure
// while the real score loaded, or whenever it couldn't, so the button could
// unlock (and print) on a number Today never showed. Until the real score
// arrives it now says so instead.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { generateCertificate } from '../../utils/certificateEngine';
import { fetchReadinessScore } from '../../services/dbQueries';
import { Badge, Button, Card } from '../../components/ui';
import { Award, Download, Lock } from '../../components/ui/icons';
import { cn } from '../../components/ui/cn';

export const CERTIFICATE_MIN_READINESS = 70;

export default function CredentialsTab({ currentUser }) {
  // 'loading' | 'ready' | 'unavailable'
  const [status, setStatus] = useState('loading');
  const [score, setScore] = useState(null);
  const [making, setMaking] = useState(false);

  const fetchScore = () => fetchReadinessScore()
    .then((r) => {
      if (typeof r?.score === 'number') { setScore(Math.round(r.score)); setStatus('ready'); }
      else setStatus('unavailable');
    })
    .catch(() => setStatus('unavailable'));
  const retry = () => { setStatus('loading'); fetchScore(); };
  useEffect(() => { fetchScore(); }, []);

  const unlocked = status === 'ready' && score >= CERTIFICATE_MIN_READINESS;

  const download = () => {
    if (!unlocked || making) return;
    setMaking(true);
    const toastId = toast.loading('Making your certificate…');
    // generateCertificate dynamic-imports jsPDF, so it is async.
    generateCertificate(currentUser, score)
      .then(() => toast.success('Certificate downloaded.', { id: toastId }))
      .catch(() => toast.error('Couldn’t make the certificate — try again.', { id: toastId }))
      .finally(() => setMaking(false));
  };

  return (
    <Card className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start">
      <div
        className={cn('w-14 h-14 shrink-0 rounded-[var(--radius-lg)] flex items-center justify-center border', unlocked ? '' : 'bg-surface2 border-border text-muted')}
        style={unlocked ? { color: 'var(--accent-text)', borderColor: 'var(--accent-velocity)', background: 'color-mix(in srgb, var(--accent-velocity) 14%, transparent)' } : undefined}
        aria-hidden="true"
      >
        {unlocked ? <Award size={26} strokeWidth={1.75} /> : <Lock size={22} strokeWidth={1.75} />}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-textMain">Readiness certificate</h3>
          {status === 'ready' && (
            <Badge tone={unlocked ? 'success' : 'neutral'}>{unlocked ? 'Unlocked' : `Readiness ${score} of ${CERTIFICATE_MIN_READINESS}`}</Badge>
          )}
        </div>
        <p className="text-sm text-muted2 leading-relaxed">
          A printable record of your Board Readiness Index, unlocked once it reaches {CERTIFICATE_MIN_READINESS}. It records your practice results; it isn’t an official PRC document.
        </p>

        {status === 'loading' && <p className="text-sm text-muted2" role="status">Checking your readiness…</p>}
        {status === 'unavailable' && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted2">Your readiness score needs a connection.</p>
            <Button size="sm" variant="secondary" onClick={retry}>Try again</Button>
          </div>
        )}
        {status === 'ready' && (
          <Button size="sm" className="self-start mt-1" onClick={download} loading={making} disabled={!unlocked || making}>
            {!making && <Download size={14} strokeWidth={1.75} aria-hidden="true" />}
            {unlocked ? 'Download certificate (PDF)' : `Unlocks at readiness ${CERTIFICATE_MIN_READINESS}`}
          </Button>
        )}
      </div>
    </Card>
  );
}
