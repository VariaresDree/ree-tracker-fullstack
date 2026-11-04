// src/features/account/StorageSettings.jsx
//
// Account › Offline & sync: what's on this device, whether the browser may clear it,
// and a plain table of where each kind of data lives. The app says what isn't safe:
// a browser can clear a whole site's data under storage pressure, and iOS can after
// seven days without use unless the app is installed.
import { useCallback, useEffect, useState } from 'react';
import { Button, ProgressIndicator, StatusPill } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { deviceEntries } from '../../services/deviceStore';
import { listDeviceFiles } from '../../services/deviceFiles';
import { getOfflinePack } from '../../services/offlinePack';
import { formatBytes } from '../../utils/bytes';

async function measure(uid) {
  const [files, quizzes, pack, estimate, persisted] = await Promise.all([
    listDeviceFiles(uid),
    deviceEntries(`${uid || 'local'}:quiz:file:`),
    getOfflinePack().catch(() => null),
    navigator.storage?.estimate?.().catch(() => null) ?? null,
    navigator.storage?.persisted?.().catch(() => null) ?? null,
  ]);
  const sum = (list) => list.reduce((n, f) => n + (f.size || 0), 0);
  const handouts = files.filter((f) => f.source?.kind === 'handout');
  const own = files.filter((f) => f.source?.kind !== 'handout');
  const rows = [
    { label: 'My files', size: sum(own), count: own.length },
    { label: 'Saved handouts', size: sum(handouts), count: handouts.length },
    { label: 'Imported quizzes', size: quizzes.reduce((n, [, q]) => n + (q.file?.size || 0), 0), count: quizzes.length },
    { label: 'Question pack', size: pack ? new Blob([JSON.stringify(pack)]).size : 0 },
  ];
  const known = rows.reduce((n, r) => n + r.size, 0);
  const usage = estimate?.usage;
  if (usage !== undefined) rows.push({ label: 'The app and everything else', size: Math.max(0, usage - known) });
  return { rows, usage, quota: estimate?.quota, persisted };
}

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isInstalled = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

const WHERE = [
  ['Answers, ratings, notes, plans', 'Your account', 'On every device you sign in on. Copies here let it work offline.'],
  ['Question pack', 'This device', 'Downloads again whenever you’re online.'],
  ['Saved handouts', 'This device', 'Save them again while you’re online.'],
  ['Imported quizzes and their scores', 'This device only', 'Never uploaded. Lost if this browser’s data goes.'],
  ['My files', 'This device only', 'Never uploaded. Lost if this browser’s data goes.'],
  ['Favourites and settings', 'This device', 'Only on this browser.'],
];

export default function StorageSettings() {
  const uid = useAuth()?.currentUser?.uid;
  const [state, setState] = useState(null);
  const [asked, setAsked] = useState(false);

  const load = useCallback(() => measure(uid).then(setState), [uid]);
  useEffect(() => { measure(uid).then(setState); }, [uid]);

  const protect = async () => {
    setAsked(true);
    await navigator.storage?.persist?.().catch(() => false);
    await load();
  };

  const canProtect = !!navigator.storage?.persist;
  const showInstall = isIos() && !isInstalled();

  return (
    <div className="flex flex-col gap-5 min-w-0">
      <div className="flex flex-col gap-3 min-w-0">
        <p className="text-sm font-medium text-textMain">Storage on this device</p>
        {state === null ? <p role="status" className="text-xs text-muted2">Measuring…</p> : (
          <>
            {state.usage !== undefined && state.quota ? (
              <div className="flex flex-col gap-1 min-w-0">
                <ProgressIndicator value={state.usage} max={state.quota} ariaLabel="Storage used" />
                <p className="text-xs text-muted2 tabular-nums">{formatBytes(state.usage)} used of the {formatBytes(state.quota)} this browser allows</p>
              </div>
            ) : <p className="text-xs text-muted2">This browser doesn’t say how much it allows.</p>}
            <ul aria-label="What’s using it" className="flex flex-col min-w-0">
              {state.rows.map((row) => (
                <li key={row.label} className="flex items-baseline justify-between gap-3 border-t border-border2/40 py-1.5 text-sm min-w-0">
                  <span className="text-muted2 min-w-0">{row.label}{row.count ? ` (${row.count})` : ''}</span>
                  <span className="font-medium text-textMain tabular-nums shrink-0">{formatBytes(row.size)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="border-t border-border2/60 pt-5 flex flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-textMain">Protected from clearing</p>
          {state?.persisted === true && <StatusPill tone="success">Protected</StatusPill>}
          {state?.persisted === false && <StatusPill tone="amber">Not protected</StatusPill>}
        </div>
        {state?.persisted === true
          ? <p className="text-xs text-muted2">The browser won’t clear this site’s storage on its own. Clearing its data by hand still removes everything here.</p>
          : <p className="text-xs text-muted2">A browser can clear a whole site’s data when it runs short of space, so make a backup now and then, in Your data below.</p>}
        {state?.persisted === false && canProtect && (
          <div>
            <Button size="sm" variant="secondary" onClick={protect}>Ask the browser to protect it</Button>
          </div>
        )}
        {asked && state?.persisted === false && (
          <p role="status" className="text-xs text-muted2">The browser said no for now. Browsers decide this themselves, and installing the app or using it more often can change it.</p>
        )}
        {showInstall && (
          <p className="text-xs text-muted2">On iPhone and iPad, Safari can clear data after seven days without use. Add the app to your Home Screen (Share, then Add to Home Screen) to stop that.</p>
        )}
      </div>

      <div className="border-t border-border2/60 pt-5 flex flex-col gap-2 min-w-0">
        <p id="where-data-lives" className="text-sm font-medium text-textMain">Where your data lives</p>
        <ul aria-labelledby="where-data-lives" className="flex flex-col min-w-0">
          {WHERE.map(([what, where, note]) => (
            <li key={what} className="flex flex-col gap-0.5 border-t border-border2/40 py-2 text-sm min-w-0">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-textMain font-medium">{what}</span>
                <span className="text-muted2 text-xs">{where}</span>
              </span>
              <span className="text-xs text-muted2">{note}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted2">The app doesn’t encrypt what’s on this device. Your device’s own lock is what protects it, so take care on a shared one.</p>
      </div>
    </div>
  );
}
