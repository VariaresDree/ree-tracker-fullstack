// src/features/links/LinksTab.jsx
//
// Library › Links: the learner's own resources — a Drive folder per subject, a
// video playlist, a flashcard deck, a Google Form quiz — filed by subject and
// pinned when they're favourites. The CELE tracker's "Useful links" (and its
// per-subject Drive folders), for the REE board. Handouts are the app's own
// material; these are yours. Offline-first (useUserLinks).
import { useState } from 'react';
import toast from 'react-hot-toast';
import { CANONICAL_SUBJECTS, USER_LINK_LIMITS, linkKind, linkUrl, userLinkErrors } from '@ree/shared';
import { Button, EmptyState, FormField, Input, Modal, Select, Skeleton, Textarea, IconChip } from '../../components/ui';
import { ArrowUpRight, ClipboardList, CloudOff, FolderOpen, Layers, Pencil, Pin, PinOff, Play, Plus, ShieldAlert, Trash2 } from '../../components/ui/icons';
import { useUserLinks } from './useUserLinks';

const KIND = {
  drive: { icon: FolderOpen, label: 'Drive' },
  video: { icon: Play, label: 'Video' },
  quiz: { icon: ClipboardList, label: 'Quiz' },
  flashcards: { icon: Layers, label: 'Flashcards' },
  link: { icon: ArrowUpRight, label: 'Link' },
};
const SUBJECTS = [...CANONICAL_SUBJECTS, 'ALL'];
const SUBJECT_LABEL = { Mathematics: 'Mathematics', ESAS: 'ESAS', EE: 'EE', ALL: 'All three' };

const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

function LinkForm({ open, entry, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    title: entry?.title || '', url: entry?.url || '', subject: entry?.subject || 'EE', pinned: !!entry?.pinned, note: entry?.note || '',
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const payload = { title: form.title.trim(), url: linkUrl(form.url) || form.url.trim(), subject: form.subject, topicId: entry?.topicId || null, pinned: form.pinned, note: form.note.trim() || null };
    const found = userLinkErrors(payload);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await onSave(payload);
      onClose();
    } catch {
      /* the caller explains */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit link' : 'Add a link'}
      icon={ArrowUpRight}
      size="md"
      footer={(
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" form="link-form" loading={saving}>Save link</Button>
        </>
      )}
    >
      <form id="link-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField label="Web address" required error={errors.url} hint="A Drive folder, a video, a flashcard deck, a quiz…">
          <Input type="url" inputMode="url" value={form.url} onChange={set('url')} maxLength={USER_LINK_LIMITS.url} autoComplete="off" />
        </FormField>
        <FormField label="Name" required error={errors.title} hint="e.g. Machines handouts, PEC terms quiz">
          <Input value={form.title} onChange={set('title')} maxLength={USER_LINK_LIMITS.title} autoComplete="off" />
        </FormField>
        <FormField label="Subject" error={errors.subject}>
          <Select value={form.subject} onChange={set('subject')}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
          </Select>
        </FormField>
        <label className="flex items-center gap-2 text-sm text-textMain cursor-pointer pointer-coarse:min-h-11">
          <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={form.pinned} onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))} />
          Pin it to the top of its subject
        </label>
        <FormField label="Note" error={errors.note} hint={`${form.note.length}/${USER_LINK_LIMITS.note}. Why it's worth opening.`}>
          <Textarea rows={2} value={form.note} onChange={set('note')} maxLength={USER_LINK_LIMITS.note} />
        </FormField>
      </form>
    </Modal>
  );
}

function LinkRow({ link, onPin, onEdit, onDelete }) {
  const kind = KIND[linkKind(link.url)] || KIND.link;
  return (
    <li className="flex items-start gap-3 rounded-[var(--radius-default)] border border-border bg-surface2/30 p-3">
      <IconChip icon={kind.icon} size="sm" />
      <div className="min-w-0 flex-1">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-textMain hover:underline [overflow-wrap:anywhere] inline-flex items-center gap-1 touch-target"
        >
          {link.title}
          <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <p className="text-xs text-muted2 [overflow-wrap:anywhere]">{kind.label} · {hostOf(link.url)}</p>
        {link.note && <p className="text-xs text-muted line-clamp-2 [overflow-wrap:anywhere] mt-0.5">{link.note}</p>}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button type="button" size="icon" variant="ghost" aria-pressed={!!link.pinned} aria-label={link.pinned ? `Unpin ${link.title}` : `Pin ${link.title}`} onClick={() => onPin(link)}>
          {link.pinned ? <PinOff size={15} strokeWidth={1.75} aria-hidden="true" /> : <Pin size={15} strokeWidth={1.75} aria-hidden="true" />}
        </Button>
        <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${link.title}`} onClick={() => onEdit(link)}>
          <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <Button type="button" size="icon" variant="ghost" tone="danger" aria-label={`Delete ${link.title}`} onClick={() => onDelete(link)}>
          <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

export default function LinksTab({ embedded = false } = {}) {
  const { items, status, queuedCount, add, update, remove } = useUserLinks();
  const [form, setForm] = useState({ open: false, entry: null, key: 0 });
  const [confirm, setConfirm] = useState(null);

  const explain = (err, action) => toast.error(err?.message ? `Couldn’t ${action}: ${err.message}` : `Couldn’t ${action}. Try again.`);
  const queued = (result) => {
    if (result === 'queued') toast(navigator.onLine ? 'Saved. It syncs in a moment.' : 'Saved on this device. It syncs when you’re back online.');
  };
  const entry = (l) => ({ title: l.title, url: l.url, subject: l.subject, topicId: l.topicId || null, pinned: !!l.pinned, note: l.note || null });

  const save = async (payload) => {
    try {
      queued(form.entry ? await update(form.entry.id, payload) : await add(payload));
    } catch (err) {
      explain(err, 'save the link');
      throw err;
    }
  };
  const pin = async (l) => {
    try {
      queued(await update(l.id, { ...entry(l), pinned: !l.pinned }));
    } catch (err) {
      explain(err, 'pin the link');
    }
  };
  const confirmDelete = async () => {
    const l = confirm;
    setConfirm(null);
    try {
      queued(await remove(l.id));
    } catch (err) {
      explain(err, 'delete the link');
    }
  };

  const list = items || [];
  const open = (e = null) => setForm((f) => ({ open: true, entry: e, key: f.key + 1 }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4">
      {/* Under the handouts (Library › Handouts), the section has a visible title. */}
      {embedded ? (
        <h2 className="text-fluid-lg font-bold text-textMain">Your links</h2>
      ) : (
        <h2 className="sr-only">Links</h2>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-muted2 text-sm max-w-prose">
          Your own resources, by subject: a Drive folder, a video, a flashcard deck, a quiz. Pin the ones you open most.
        </p>
        <Button size="sm" onClick={() => open()}>
          <Plus size={14} strokeWidth={2} aria-hidden="true" /> Add link
        </Button>
      </div>

      {(queuedCount > 0 || status === 'offline' || status === 'unreachable') && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted2">
          <CloudOff size={14} strokeWidth={1.75} aria-hidden="true" />
          {queuedCount > 0 ? `${queuedCount} change${queuedCount === 1 ? '' : 's'} saved on this device, waiting to sync.` : 'Showing the links saved on this device.'}
        </p>
      )}

      {items === null ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={ArrowUpRight}
          title="No links yet"
          description="Add your Drive folder for each subject, the videos and flashcard decks you trust, and the quizzes you use for terms."
          action={<Button size="sm" variant="secondary" onClick={() => open()}>Add your first link</Button>}
        />
      ) : (
        SUBJECTS.filter((s) => list.some((l) => l.subject === s)).map((s) => (
          <section key={s} aria-labelledby={`links-${s}`} className="flex flex-col gap-2">
            <h3 id={`links-${s}`} className="text-eyebrow">{SUBJECT_LABEL[s]}</h3>
            <ul className="flex flex-col gap-2">
              {list.filter((l) => l.subject === s).map((l) => (
                <LinkRow key={l.id} link={l} onPin={pin} onEdit={open} onDelete={setConfirm} />
              ))}
            </ul>
          </section>
        ))
      )}

      {form.open && <LinkForm key={form.key} open entry={form.entry} onClose={() => setForm((f) => ({ ...f, open: false }))} onSave={save} />}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete this link?"
        icon={ShieldAlert}
        tone="danger"
        size="sm"
        footer={(
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button type="button" variant="danger" size="sm" onClick={confirmDelete}>Delete</Button>
          </>
        )}
      >
        <p className="text-sm text-muted2 leading-relaxed">Delete <strong className="text-textMain">{confirm?.title}</strong>? The page itself isn’t touched.</p>
      </Modal>
    </div>
  );
}
