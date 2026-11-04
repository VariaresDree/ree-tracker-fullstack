// src/features/library/LibraryOverview.jsx
import { useState } from 'react';
import { toDisplaySubject } from '@ree/shared';
import { useStore } from '../../store/useStore';
import { Button, Card, Grid } from '../../components/ui';
import { RefreshCw, Layers } from '../../components/ui/icons';
import toast from 'react-hot-toast';

// Per-subject track colors — data-viz distinction routed through theme vars.
// They colour the column titles and counts (text), so the text forms.
const TRACK_ACCENT = {
  Mathematics: 'var(--accent-signal)',
  ESAS: 'var(--accent-text)',
  EE: 'var(--color-reeAmber-text)',
};

export default function LibraryOverview({ serverStats, vaultMetadata, resyncVaultMetadata }) {

  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleResync = async () => {
    setIsSyncing(true);
    try {
      await resyncVaultMetadata();
      toast.success("Question counts refreshed.");
    } catch {
      toast.error("Refresh failed.");
    }
    setIsSyncing(false);
  };

  return (
    <Card padding="md" className="shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-4">
        <h3 className="text-h3 text-textMain flex items-center gap-2">
          <Layers size={18} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent-text)]" /> Question bank overview
        </h3>
        <Button size="sm" variant="secondary" loading={isSyncing} disabled={isSyncing} onClick={handleResync}>
          {!isSyncing && <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />} Refresh counts
        </Button>
      </div>

      <Grid kind="kpi" gap="sm">
        {[
          { label: 'Total questions', value: serverStats?.total || 0, accent: null },
          { label: 'Mathematics', value: serverStats?.math || 0, accent: TRACK_ACCENT.Mathematics },
          { label: 'ESAS', value: serverStats?.esas || 0, accent: TRACK_ACCENT.ESAS },
          { label: 'EE', value: serverStats?.ee || 0, accent: TRACK_ACCENT.EE },
        ].map((s) => (
          <Card
            key={s.label}
            variant="inset"
            className="p-4 text-center min-w-0"
            style={{ borderColor: s.accent ? `color-mix(in srgb, ${s.accent} 20%, transparent)` : 'var(--border-light)' }}
          >
            <div className="text-display text-3xl tabular-nums" style={{ color: s.accent || 'var(--text-main)' }}>{s.value}</div>
            <div className="text-eyebrow mt-1">{s.label}</div>
          </Card>
        ))}
      </Grid>

      <Grid kind="cards" className="animate-in fade-in">
        {['Mathematics', 'ESAS', 'EE'].map(s => {
          const accent = TRACK_ACCENT[s];
          const safeSubj = toDisplaySubject(s);

          return (
            // Up to 280px, then the topic list scrolls; a short list no
            // longer leaves a fixed 280px box mostly empty.
            <Card key={s} variant="inset" className="p-4 flex flex-col max-h-[280px] min-w-0" style={{ borderColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}>
              <div className="border-b border-border2 pb-3 mb-3 shrink-0">
                <div className="text-eyebrow" style={{ color: accent }}>{s}</div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                {(dynamicTOS[s] || []).map(sub => {
                  const count = vaultMetadata ? vaultMetadata[`${safeSubj}_${sub}`] || 0 : 0;
                  return (
                    <div key={sub} className="flex justify-between items-center text-xs group shrink-0">
                      <span className={`truncate pr-3 transition-colors ${count > 0 ? 'text-textMain font-medium' : 'text-muted2'}`} title={sub}>{sub}</span>
                      <span
                        className="font-mono text-micro px-2 py-0.5 rounded-[var(--radius-sm)] border tabular-nums"
                        style={count > 0
                          ? { color: accent, background: `color-mix(in srgb, ${accent} 10%, transparent)`, borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`, fontWeight: 700 }
                          : { opacity: 0.3 }}
                      >{count}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </Grid>

    </Card>
  );
}
