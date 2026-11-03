// src/features/admin/ai/AiStatusPanel.jsx
//
// Admin › AI models: which model answers each AI feature, how fast it has
// been, whether it is failing, and which provider keys the server has. The
// chains themselves live in ree-tracker-backend/src/config/aiModels.js.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAiStatus, setAiStatus } from '../../../hooks/useAiStatus';
import { probeAiModels } from '../../../services/geminiApi';
import { Button, Card, SectionHeader, StatusPill, Skeleton, EmptyState } from '../../../components/ui';
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

// An env key name with a line-break hint after each underscore, so a narrow
// card wraps GROQ_API_KEY at its underscores, not as "GROQ_API_K / EY".
// <wbr>, not a zero-width space: the name copies exactly, for pasting into
// the server's environment.
const keyName = (key) => String(key || '').split('_').flatMap((part, i, all) => (i < all.length - 1 ? [part, '_', <wbr key={i} />] : [part]));

const secs = (ms) => (ms == null ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

const backupLabel = (m) => {
  const notes = [
    m.picked && 'picked',
    m.state !== 'ok' && m.state !== 'unknown' && (STATE[m.state] || STATE.unknown).label.toLowerCase(),
    m.calls && m.medianMs != null && secs(m.medianMs),
    m.calls && `${Math.round((m.successRate ?? 0) * 100)}%`,
  ].filter(Boolean);
  return notes.length ? `${m.model} (${notes.join(', ')})` : m.model;
};

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
        description="Each feature has its own chain of models. When one fails or times out, the next one answers."
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

      <section aria-labelledby="ai-features" className="flex flex-col gap-3">
        <h3 id="ai-features" className="text-h3 text-textMain">Features</h3>
        {/* One row a feature: who answers now, who's next, and any model in
            trouble, with its reason. Healthy backups are a name in a line, not a
            row each, so a failure stands out. It was a card a feature and a row a
            model: 3,513px, where nearly everything said "Working". */}
        <Card as="ul" className="divide-y divide-border">
          {Object.entries(status.tasks).map(([id, t]) => {
            const lead = t.chain.find((m) => m.model === t.primary?.model);
            const backups = t.chain.filter((m) => m !== lead);
            const troubled = t.chain.filter((m) => m.lastError && m.state !== 'ok');
            return (
              <li key={id} data-feature-row className="px-4 py-3 flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="min-w-0 text-sm font-semibold text-textMain">
                    {t.label}
                    <span className="font-normal text-xs text-muted2"> · {t.audience === 'admin' ? 'Admin' : 'Learners'}, {t.tier === 'fast' ? 'speed first' : 'accuracy first'}</span>
                  </span>
                  <Pill state={t.state} />
                </div>
                <p className="text-xs text-muted2 [overflow-wrap:anywhere]">
                  {t.primary ? <>Answering now: <span className="font-mono text-textMain">{t.primary.model}</span> on {t.primary.providerLabel}</> : 'No model can answer.'}
                  {lead?.calls ? ` · ${lead.medianMs != null ? `${secs(lead.medianMs)} median, ` : ''}${Math.round((lead.successRate ?? 0) * 100)}%` : ''}
                  {` · up to ${secs(t.perModelTimeoutMs)} each, ${secs(t.budgetMs)} in all`}
                </p>
                {backups.length > 0 && (
                  <p className="text-xs text-muted2 [overflow-wrap:anywhere]">
                    Then: {backups.map(backupLabel).join(', ')}
                  </p>
                )}
                {troubled.map((m) => (
                  <p key={m.id} data-chain-error className="text-xs [overflow-wrap:anywhere]" style={{ color: 'var(--accent-danger)' }}>
                    {m.model}: {ERROR_KIND[m.lastError.kind] || m.lastError.kind}{m.lastError.message ? ` (${m.lastError.message.slice(0, 140)})` : ''}
                  </p>
                ))}
              </li>
            );
          })}
        </Card>
        <p className="text-xs text-muted2">"Picked" backups follow each provider's current model list, so a renamed or retired model is replaced on its own. "Not offered" means the provider no longer lists that model, so it's skipped. Speeds reset when the server restarts. Checked {new Date(status.checkedAt).toLocaleTimeString()}.</p>
      </section>

      <section aria-labelledby="ai-providers" className="flex flex-col gap-3">
        <h3 id="ai-providers" className="text-h3 text-textMain">Providers</h3>
        <Card as="ul" className="divide-y divide-border">
          {providers.map(([id, p]) => (
            <li key={id} className="px-4 py-2 flex items-start gap-2 min-w-0">
              {p.configured
                ? <Check size={16} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--accent-success)' }} className="shrink-0 mt-0.5" />
                : <X size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 mt-0.5 text-muted" />}
              <p className="min-w-0 text-xs text-muted2">
                <span className="text-sm font-semibold text-textMain">{p.label}</span>{' · '}
                {!p.configured ? <>No key on the server: <span data-env-key className="font-mono [overflow-wrap:break-word]">{keyName(p.envKey)}</span></>
                  : p.catalog?.ok ? `Key works, ${p.catalog.models} models offered${p.catalog.free != null ? `, ${p.catalog.free} free` : ''}`
                    : p.catalog ? `Key set, model list: ${p.catalog.error}`
                      : 'Key set'}
              </p>
            </li>
          ))}
        </Card>
        {missing.length > 0 && (
          <p className="text-xs text-muted2">Models from a provider without a key are skipped. Set the key in the backend's environment on Render to use them.</p>
        )}
      </section>
    </div>
  );
}
