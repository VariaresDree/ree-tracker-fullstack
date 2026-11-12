// src/features/admin/health/AppHealthPanel.jsx
//
// Admin › App health: which app versions people ran this week, so you can see
// when a device is left behind before changing something both sides depend on,
// and the errors the app and the server hit (services/appHealth, on the server
// services/serverErrorCapture). An error's page and version say where to look.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiRequest } from '../../../services/dbQueries';
import { APP_VERSION } from '../../../services/appUpdate';
import { Button, Card, Disclosure, EmptyState, SectionHeader, Skeleton, StatusPill } from '../../../components/ui';
import { Check, RefreshCw, TriangleAlert } from '../../../components/ui/icons';
import PushSwitch from './PushSwitch';

const when = (iso) => new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
const people = (n) => `${n} ${n === 1 ? 'person' : 'people'}`;

function Versions({ versions }) {
  if (versions.length === 0) {
    return <p className="text-sm text-muted2">No app has reported a version in the last 7 days.</p>;
  }
  return (
    <Card as="ul" padding="none" className="divide-y divide-border">
      {versions.map((v) => (
        <li key={v.version} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
          <span className="font-mono text-sm text-textMain">{v.version}</span>
          {v.version === APP_VERSION && <StatusPill tone="success">On this device</StatusPill>}
          <span className="text-sm text-muted2">{people(v.people)}</span>
          <span className="text-xs text-muted2 ml-auto">Last seen {when(v.lastSeenAt)}</span>
        </li>
      ))}
    </Card>
  );
}

function ErrorRow({ error, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const dismiss = async () => {
    setBusy(true);
    try {
      await onDismiss(error.id);
    } catch (err) {
      toast.error(err.message || 'Could not dismiss that error.');
      setBusy(false);
    }
  };
  return (
    <Card as="li" padding="sm" className="flex flex-col gap-2 min-w-0">
      <div className="flex items-start gap-3 min-w-0">
        <p className="text-sm font-medium text-textMain min-w-0 flex-1 [overflow-wrap:anywhere]">{error.message}</p>
        <Button variant="secondary" size="sm" onClick={dismiss} loading={busy}>Dismiss</Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted2">
        <StatusPill tone={error.source === 'server' ? 'amber' : 'neutral'}>{error.source === 'server' ? 'Server' : 'App'}</StatusPill>
        <span>{error.count === 1 ? 'Once' : `${error.count} times`}</span>
        <span>Last {when(error.lastSeenAt)}</span>
        {error.route && <span className="font-mono [overflow-wrap:anywhere]">{error.route}</span>}
        {error.version && <span className="font-mono">{error.version}</span>}
      </div>
      {error.stack && (
        <Disclosure title="Stack">
          <pre className="text-xs text-muted2 whitespace-pre-wrap [overflow-wrap:anywhere]">{error.stack}</pre>
        </Disclosure>
      )}
    </Card>
  );
}

export default function AppHealthPanel() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let live = true;
    apiRequest('/api/admin/app-health', 'GET', null, { timeoutMs: 30_000 })
      .then((res) => { if (live) { setData(res); setFailed(null); } })
      .catch((err) => { if (live) setFailed(err.message || 'Could not load app health.'); });
    return () => { live = false; };
  }, [nonce]);

  const dismiss = async (id) => {
    await apiRequest(`/api/admin/app-health/errors/${encodeURIComponent(id)}`, 'DELETE');
    setData((d) => ({ ...d, errors: d.errors.filter((e) => e.id !== id) }));
  };

  const header = (
    <SectionHeader
      title="App health"
      description="Which versions people are running, and the errors the app and the server hit."
      actions={(
        <Button variant="secondary" size="sm" onClick={() => setNonce((n) => n + 1)}>
          <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" /> Refresh
        </Button>
      )}
    />
  );

  if (failed && !data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState icon={TriangleAlert} title="Could not load app health" description={failed} />
      </div>
    );
  }
  if (!data) {
    return <div className="flex flex-col gap-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <PushSwitch />
      <section aria-labelledby="health-versions" className="flex flex-col gap-3">
        <h3 id="health-versions" className="text-h3 text-textMain">Versions, last 7 days</h3>
        <Versions versions={data.versions} />
      </section>
      <section aria-labelledby="health-errors" className="flex flex-col gap-3">
        <h3 id="health-errors" className="text-h3 text-textMain">Errors</h3>
        {data.errors.length === 0 ? (
          <EmptyState compact icon={Check} title="No errors" description="Nothing has been reported. Dismissed errors come back if they happen again." />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.errors.map((e) => <ErrorRow key={e.id} error={e} onDismiss={dismiss} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
