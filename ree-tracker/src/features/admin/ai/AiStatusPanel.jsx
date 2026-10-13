// src/features/admin/ai/AiStatusPanel.jsx
//
// Admin › AI models: which model answers each AI feature, how fast it has
// been, whether it is failing, and which provider keys the server has. The
// chains themselves live in ree-tracker-backend/src/config/aiModels.js.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAiStatus, setAiStatus } from '../../../hooks/useAiStatus';
import { probeAiModels } from '../../../services/geminiApi';
import { Button, StatusPill, Skeleton, EmptyState } from '../../../components/ui';
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
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
        <div>
          <h2 className="text-display text-2xl text-textMain tracking-tight">AI models</h2>
          <p className="text-sm text-muted2 mt-1 max-w-2xl">
            Each feature has its own chain of models. Learner features use fast open models; admin generation uses the most accurate one.
            When a model fails or times out, the next one answers, and a failing model is skipped for a while.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={() => refresh()}>
            <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" /> Refresh
          </Button>
          <Button size="sm" onClick={probe} loading={probing}>
            <Activity size={14} strokeWidth={1.75} aria-hidden="true" /> Test all models
          </Button>
        </div>
      </div>

      <section aria-labelledby="ai-providers" className="flex flex-col gap-3">
        <h3 id="ai-providers" className="text-base font-semibold text-textMain">Providers</h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {providers.map(([id, p]) => (
            <li key={id} className="bg-surface border border-border rounded-[var(--radius-lg)] p-4 flex items-start gap-3">
              {p.configured
                ? <Check size={18} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--accent-success)' }} className="shrink-0 mt-0.5" />
                : <X size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 mt-0.5 text-muted" />}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-textMain">{p.label}</div>
                <div className="text-xs text-muted2 font-mono [overflow-wrap:anywhere]">{p.envKey}</div>
                <div className="text-xs text-muted2 mt-0.5">
                  {!p.configured ? 'No key on the server'
                    : p.catalog?.ok ? `Key works · ${p.catalog.models} models offered`
                      : p.catalog ? `Key set · model list: ${p.catalog.error}`
                        : 'Key set'}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {missing.length > 0 && (
          <p className="text-xs text-muted2 max-w-2xl">
            Models from a provider without a key are skipped. Set {missing.map(([, p]) => p.envKey).join(', ')} in the backend's environment on Render to use them; Groq is free and is the first choice for most features.
          </p>
        )}
      </section>

      <section aria-labelledby="ai-features" className="flex flex-col gap-3">
        <h3 id="ai-features" className="text-base font-semibold text-textMain">Features</h3>
        <ul className="flex flex-col gap-3">
          {Object.entries(status.tasks).map(([id, t]) => (
            <li key={id} className="bg-surface border border-border rounded-[var(--radius-lg)] p-4 flex flex-col gap-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-textMain">{t.label}</span>
                  <span className="text-xs text-muted2">{t.audience === 'admin' ? 'Admin' : 'Learners'} · {t.tier === 'fast' ? 'speed first' : 'accuracy first'}</span>
                </div>
                <Pill state={t.state} />
              </div>
              <p className="text-xs text-muted2">
                {t.primary ? <>Answering now: <span className="text-textMain">{t.primary.model}</span> on {t.primary.providerLabel}</> : 'No model can answer.'}
                {' · '}each model gets up to {secs(t.perModelTimeoutMs)}, {secs(t.budgetMs)} in all
              </p>
              <ol className="flex flex-col divide-y divide-border border border-border rounded-[var(--radius-default)] bg-bg">
                {t.chain.map((m, i) => (
                  <li key={m.id} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs min-w-0">
                    <span className="text-muted tabular-nums w-4 shrink-0">{i + 1}</span>
                    <span className="font-mono text-textMain [overflow-wrap:anywhere] min-w-0 flex-1">{m.model}</span>
                    <span className="text-muted2 shrink-0">{m.providerLabel}</span>
                    <span className="text-muted2 tabular-nums shrink-0 sm:w-28">
                      {m.calls ? `${secs(m.medianMs)} median · ${Math.round((m.successRate ?? 0) * 100)}%` : ''}
                    </span>
                    <span className="shrink-0"><Pill state={m.state} /></span>
                    {m.lastError && m.state !== 'ok' && (
                      <span className="sm:basis-full text-[11px] [overflow-wrap:anywhere]" style={{ color: 'var(--accent-danger)' }}>
                        Last failure: {ERROR_KIND[m.lastError.kind] || m.lastError.kind}{m.lastError.message ? ` (${m.lastError.message.slice(0, 140)})` : ''}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted2">"Not offered" means the provider's own model list doesn't include that model (checked at startup and every 6 hours), so it is skipped. Speeds are from this server's recent requests and reset when it restarts. Checked {new Date(status.checkedAt).toLocaleTimeString()}.</p>
      </section>
    </div>
  );
}
