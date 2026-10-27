// src/features/admin/ai/AiStatusPanel.jsx
//
// Admin › AI models: which model answers each AI feature, how fast it has
// been, whether it is failing, and which provider keys the server has. The
// chains themselves live in ree-tracker-backend/src/config/aiModels.js.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAiStatus, setAiStatus } from '../../../hooks/useAiStatus';
import { probeAiModels } from '../../../services/geminiApi';
import { Button, Card, Grid, SectionHeader, StatusPill, Skeleton, EmptyState } from '../../../components/ui';
import { RefreshCw, Activity, Check, X } from '../../../components/ui/icons';

const STATE = {
  ok: { tone: 'success', label: 'Working' },
  unknown: { tone: 'neutral', label: 'Not used yet' },
  slow: { tone: 'amber', label: 'Slow' },
  degraded: { tone: 'amber', label: 'Some failures' },
  backup: { tone: 'amber', label: 'On backup' },
  down: { tone: 'danger', label: 'Down' },
  unconfigured: { tone: 'neutral', label: 'No key' },
  missing: { tone: 'danger', label: 'Not offered' },
};

const ERROR_KIND = {
  not_found: 'model not found (retired or renamed)',
  auth: 'API key rejected',
  rate_limited: 'rate limited',
  timeout: 'timed out',
  unavailable: 'provider unavailable',
  bad_output: 'unusable answer',
  too_large: 'request too large',
  other: 'error',
};

const secs = (ms) => (ms == null ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

function Pill({ state }) {
  const s = STATE[state] || STATE.unknown;
  return <StatusPill tone={s.tone}>{s.label}</StatusPill>;
}

export default function AiStatusPanel() {
  const { status, refresh } = useAiStatus();
  const [probing, setProbing] = useState(false);

  const probe = async () => {
    setProbing(true);
    try {
      const res = await probeAiModels();
      setAiStatus(res.status);
      const ok = res.results.filter((r) => r.ok).length;
      toast.success(`${ok} of ${res.results.length} models answered.`);
    } catch (err) {
      toast.error(err.message || 'Could not test the models.');
    } finally {
      setProbing(false);
    }
  };

  if (!status) {
    return <div className="flex flex-col gap-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64" /></div>;
  }
  if (!status.providers) {
    return <EmptyState icon={Activity} title="Model details are for admins" description="Sign in with an admin account to see the model chains." />;
  }

  const providers = Object.entries(status.providers);
  const missing = providers.filter(([, p]) => !p.configured);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="AI models"
        description="Each feature has its own chain of models. Learner features use fast open models; admin generation uses the most accurate one. When a model fails or times out, the next one answers, and a failing model is skipped for a while."
        actions={(
          <>
            <Button variant="secondary" size="sm" onClick={() => refresh()}>
              <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" /> Refresh
            </Button>
            <Button size="sm" onClick={probe} loading={probing}>
              <Activity size={14} strokeWidth={1.75} aria-hidden="true" /> Test all models
            </Button>
          </>
        )}
      />

      <section aria-labelledby="ai-providers" className="flex flex-col gap-3">
        <h3 id="ai-providers" className="text-h3 text-textMain">Providers</h3>
        <Grid kind="kpi" gap="sm" as="ul">
          {providers.map(([id, p]) => (
            <Card as="li" key={id} padding="sm" className="flex items-start gap-3 min-w-0">
              {p.configured
                ? <Check size={18} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--accent-success)' }} className="shrink-0 mt-0.5" />
                : <X size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 mt-0.5 text-muted" />}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-textMain">{p.label}</div>
                <div className="text-xs text-muted2 font-mono [overflow-wrap:anywhere]">{p.envKey}</div>
                <div className="text-xs text-muted2 mt-0.5">
                  {!p.configured ? 'No key on the server'
                    : p.catalog?.ok ? `Key works · ${p.catalog.models} models offered${p.catalog.free != null ? `, ${p.catalog.free} free` : ''}`
                      : p.catalog ? `Key set · model list: ${p.catalog.error}`
                        : 'Key set'}
                </div>
              </div>
            </Card>
          ))}
        </Grid>
        {missing.length > 0 && (
          <p className="text-xs text-muted2 max-w-2xl">
            Models from a provider without a key are skipped. Set {missing.map(([, p]) => p.envKey).join(', ')} in the backend's environment on Render to use them; Groq is free and is the first choice for most features.
          </p>
        )}
      </section>

      <section aria-labelledby="ai-features" className="flex flex-col gap-3">
        <h3 id="ai-features" className="text-h3 text-textMain">Features</h3>
        <ul className="flex flex-col gap-3">
          {Object.entries(status.tasks).map(([id, t]) => (
            <Card as="li" key={id} padding="sm" className="flex flex-col gap-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-textMain">{t.label}</span>
                  <span className="text-xs text-muted2">{t.audience === 'admin' ? 'Admin' : 'Learners'} · {t.tier === 'fast' ? 'speed first' : 'accuracy first'}</span>
                </div>
                <Pill state={t.state} />
              </div>
              <p className="text-xs text-muted2 [overflow-wrap:anywhere]">
                {t.primary ? <>Answering now: <span className="text-textMain">{t.primary.model}</span> on {t.primary.providerLabel}</> : 'No model can answer.'}
                {' · '}each model gets up to {secs(t.perModelTimeoutMs)}, {secs(t.budgetMs)} in all
              </p>
              {/* Each row is a grid on the list's own width. It was a flex row
                  that went single-line at the window's sm: beside the sidebar
                  that left the model name (flex-1, basis 0) a few pixels after
                  the fixed columns, and a failure line with basis-full but no
                  wrap took the rest, so a long id like
                  google/gemma-4-31b-it:free broke after every character.
                  Narrow: the number, then the name, with provider, speed and
                  state wrapping under the name. From 42rem: one line, the
                  columns lined up row to row. A failure always takes its own
                  line under the name. */}
              <ol className="@container flex flex-col divide-y divide-border border border-border rounded-[var(--radius-default)] bg-bg">
                {t.chain.map((m, i) => (
                  <li key={m.id} data-chain-row className="px-3 py-2 grid grid-cols-[1rem_minmax(0,1fr)] @2xl:grid-cols-[1rem_minmax(0,1fr)_6.5rem_9rem_7.5rem] items-center gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted tabular-nums">{i + 1}</span>
                    <span className="font-mono text-textMain [overflow-wrap:anywhere] min-w-0">
                      {m.model}
                      {m.picked && <span className="font-sans text-muted2"> · picked from the provider's current list</span>}
                    </span>
                    <div className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 @2xl:contents">
                      <span className="text-muted2">{m.providerLabel}</span>
                      <span className="text-muted2 tabular-nums">
                        {m.calls ? `${secs(m.medianMs)} median · ${Math.round((m.successRate ?? 0) * 100)}%` : ''}
                      </span>
                      <span className="@2xl:justify-self-end"><Pill state={m.state} /></span>
                    </div>
                    {m.lastError && m.state !== 'ok' && (
                      <span data-chain-error className="[grid-column:2/-1] text-micro [overflow-wrap:anywhere]" style={{ color: 'var(--accent-danger)' }}>
                        Last failure: {ERROR_KIND[m.lastError.kind] || m.lastError.kind}{m.lastError.message ? ` (${m.lastError.message.slice(0, 140)})` : ''}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </ul>
        <p className="text-xs text-muted2">Backups marked "picked" follow each provider's current model list, so a renamed or retired model is replaced on its own; OpenRouter backups are always free models. "Not offered" means the provider's own model list doesn't include that model (checked at startup and every 6 hours), so it is skipped. Speeds are from this server's recent requests and reset when it restarts. Checked {new Date(status.checkedAt).toLocaleTimeString()}.</p>
      </section>
    </div>
  );
}
