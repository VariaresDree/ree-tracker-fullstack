// src/features/account/AppVersion.jsx
//
// Account › About this app: which build this device is running, and a way to
// ask for a newer one now. A device that missed an update used to look
// exactly like one that had it (services/appUpdate.js).
import { useState } from 'react';
import { Button } from '../../components/ui';
import { RefreshCw } from '../../components/ui/icons';
import { APP_VERSION, checkForUpdate } from '../../services/appUpdate';

export default function AppVersion() {
  const [state, setState] = useState('idle'); // idle | checking | done
  const check = async () => {
    setState('checking');
    try { await checkForUpdate(); } finally { setState('done'); }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted2">
        Version <span className="font-mono text-textMain">{APP_VERSION}</span>
        {state === 'done' && <span role="status"> · checked; a newer version, if any, loads at the next safe moment</span>}
      </p>
      <Button size="sm" variant="secondary" onClick={check} loading={state === 'checking'} disabled={state === 'checking'}>
        <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" /> Check for updates
      </Button>
    </div>
  );
}
