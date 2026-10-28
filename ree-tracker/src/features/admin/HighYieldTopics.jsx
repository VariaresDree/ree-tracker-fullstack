// src/features/admin/HighYieldTopics.jsx
//
// Admin › Question bank › High-yield topics: mark the syllabus topics the
// board asks often (the CELE tracker's "Meta topics"). Learners see a
// High-yield badge on them in Progress › Syllabus and can filter to them. It
// changes no engine. Loaded when opened (GET /api/config/topics, admin only);
// each box saves at once (PUT /api/config/topics/:id).
import { useState } from 'react';
import toast from 'react-hot-toast';
import { CANONICAL_SUBJECTS } from '@ree/shared';
import { apiRequest } from '../../services/dbQueries';
import { Button, Disclosure, Skeleton } from '../../components/ui';
import { RotateCcw } from '../../components/ui/icons';

export default function HighYieldTopics() {
  const [topics, setTopics] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [saving, setSaving] = useState(null);

  const load = async () => {
    setStatus('loading');
    try {
      const res = await apiRequest('/api/config/topics');
      setTopics(res?.topics || []);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  const toggle = async (t) => {
    setSaving(t.id);
    const next = !t.highYield;
    setTopics((list) => list.map((x) => (x.id === t.id ? { ...x, highYield: next } : x)));
    try {
      await apiRequest(`/api/config/topics/${encodeURIComponent(t.id)}`, 'PUT', { highYield: next });
    } catch (err) {
      setTopics((list) => list.map((x) => (x.id === t.id ? { ...x, highYield: !next } : x)));
      toast.error(err?.message ? `Couldn’t save: ${err.message}` : 'Couldn’t save. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const count = (topics || []).filter((t) => t.highYield).length;

  return (
    <Disclosure
      title="High-yield topics"
      description={topics ? `${count} marked. Learners see a High-yield badge and can filter to them.` : 'Mark the topics the board asks often.'}
      onToggle={(open) => { if (open && status === 'idle') load(); }}
      bodyClassName="flex flex-col gap-4"
    >
      {status === 'loading' && <Skeleton className="h-32 w-full" />}
      {status === 'error' && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted2">Couldn’t load the topics.</p>
          <Button size="sm" variant="secondary" onClick={load}><RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" /> Try again</Button>
        </div>
      )}
      {status === 'ready' && CANONICAL_SUBJECTS.map((s) => {
        const list = topics.filter((t) => t.subject === s);
        if (list.length === 0) return null;
        return (
          <fieldset key={s} className="flex flex-col gap-1">
            <legend className="text-eyebrow mb-1">{s}</legend>
            {list.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm text-textMain cursor-pointer pointer-coarse:min-h-11">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--accent)]"
                  checked={!!t.highYield}
                  disabled={saving === t.id}
                  onChange={() => toggle(t)}
                />
                {t.name}
              </label>
            ))}
          </fieldset>
        );
      })}
    </Disclosure>
  );
}
