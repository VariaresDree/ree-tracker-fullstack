// src/components/SyncIssues.jsx
//
// Surfaces the sync pipeline's quarantine (store.deadLetters). Before this,
// nothing in the app read dead letters at all: the badge counted only what was
// still queued, and the red "Sync error" status was overwritten by the next
// successful flush — so a quarantined batch of answers vanished without a
// trace. Letters now keep their payload, so each one can be retried or
// discarded deliberately.
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { auth } from '../config/firebaseDb';
import { Button, Modal } from './ui';
import { TriangleAlert } from './ui/icons';
import { syncActionLabel, syncFailureReason } from './syncLabels';

// What each letter was, in words; the endpoint and the server's own text stay
// in a "Details" fold for when someone asks for help.
const describe = (letter) => {
    const n = letter.attempts?.length ?? letter.ids?.length ?? 0;
    const answers = `${n} answer${n === 1 ? '' : 's'}`;
    const method = letter.write?.method;
    if (letter.type === 'pendingWrite') return { title: syncActionLabel(letter.endpoint, method), detail: syncFailureReason(letter) };
    if (letter.type === 'pendingWrite-orphaned') return { title: `${syncActionLabel(letter.endpoint, method)} from another account`, detail: 'Recorded on this device before a different sign-in.' };
    if (letter.type === 'telemetry-orphaned') return { title: `${answers} from another account`, detail: 'Recorded on this device before a different sign-in.' };
    return { title: answers, detail: syncFailureReason(letter) };
};

const technical = (letter) => [letter.write?.method, letter.endpoint, letter.status, letter.error].filter(Boolean).join(' · ');

const canRetry = (letter) => {
    if (letter.type.endsWith('-orphaned')) return letter.ownerUid === auth.currentUser?.uid;
    return (Array.isArray(letter.attempts) && letter.attempts.length > 0) || !!letter.write;
};

export default function SyncIssues({ className = '' }) {
    const deadLetters = useStore((s) => s.deadLetters);
    const retryDeadLetter = useStore((s) => s.retryDeadLetter);
    const discardDeadLetter = useStore((s) => s.discardDeadLetter);
    const [open, setOpen] = useState(false);
    const [busyId, setBusyId] = useState(null);
    // Discard deletes unsynced answers for good, so it asks once more, in the
    // row itself. It used to delete on the first tap.
    const [confirmKey, setConfirmKey] = useState(null);

    const count = deadLetters?.length || 0;
    if (count === 0) return null;

    const retry = async (id) => {
        setBusyId(id);
        try { await retryDeadLetter(id); } finally { setBusyId(null); }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`w-full flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 pointer-coarse:min-h-11 text-left text-xs font-semibold transition-colors cursor-pointer ${className}`}
                style={{
                    borderColor: 'color-mix(in srgb, var(--accent-danger) 40%, transparent)',
                    color: 'var(--accent-danger)',
                    background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
                }}
            >
                <span className="flex items-center gap-1.5">
                    <TriangleAlert size={14} strokeWidth={2} aria-hidden="true" />
                    {count} sync issue{count === 1 ? '' : 's'}
                </span>
                <span className="underline underline-offset-2">Review</span>
            </button>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="Sync issues"
                icon={TriangleAlert}
                tone="danger"
                eyebrow="Not uploaded"
                footer={<Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Close</Button>}
            >
                <p className="text-sm text-muted2 mb-4">
                    The server refused these. Retry sends them again; discard deletes them from this device.
                </p>
                <ul className="flex flex-col gap-3">
                    {deadLetters.map((letter, i) => {
                        const { title, detail } = describe(letter);
                        const key = letter.id || `legacy-${i}`;
                        return (
                            <li key={key} className="flex items-start justify-between gap-3 p-3 rounded-[var(--radius-default)] bg-surface2 border border-border">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-textMain">{title}</div>
                                    <div className="text-xs text-muted2">{detail}</div>
                                    <div className="text-xs text-muted2">{new Date(letter.at).toLocaleString()}</div>
                                    {technical(letter) && (
                                        <details className="mt-1 text-xs text-muted2">
                                            <summary className="cursor-pointer pointer-coarse:min-h-11 inline-flex items-center">Details</summary>
                                            <span className="block break-all">{technical(letter)}</span>
                                        </details>
                                    )}
                                </div>
                                {confirmKey === key ? (
                                    <div className="flex flex-col items-end gap-2 shrink-0" role="group" aria-label="Confirm discard">
                                        <span className="text-xs text-textMain">Delete for good?</span>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="secondary" onClick={() => setConfirmKey(null)}>Cancel</Button>
                                            <Button size="sm" tone="danger" onClick={() => { setConfirmKey(null); discardDeadLetter(letter.id || letter); }}>
                                                Yes, discard
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 shrink-0">
                                        {letter.id && canRetry(letter) && (
                                            <Button size="sm" variant="secondary" loading={busyId === letter.id} onClick={() => retry(letter.id)}>
                                                Retry
                                            </Button>
                                        )}
                                        <Button size="sm" variant="ghost" tone="danger" onClick={() => setConfirmKey(key)}>
                                            Discard
                                        </Button>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </Modal>
        </>
    );
}
