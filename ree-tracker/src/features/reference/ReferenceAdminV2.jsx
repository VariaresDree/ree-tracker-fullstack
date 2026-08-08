// src/features/reference/ReferenceAdminV2.jsx
// Admin console for the reference flashcard vault (replaces ReferenceAdmin):
//   1. Review queue — AI-submitted cards, per-card approve/reject/edit + the
//      same confirmation-gated "Accept All" pattern as the question queue.
//   2. Add card — manual creation through the full required-field gate
//      (taxonomy dropdowns from the SHARED dynamicTOS, dynamic variables
//      editor, dimensionless exception, source citation).
//   3. AI generate — schema-locked generation; rows are previewed with
//      per-row completeness state and only complete rows can be queued
//      (the server re-validates and rejects incomplete output pre-queue).
//   4. Live cards — edit / re-categorize / delete published cards.
//   5. Sources — CRUD over the authoritative citations (textbook/code/PEC).
//   6. Data debt — the Pillar-5 report of any card failing required fields.
import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import {
    Button, Modal, FormField, Input, Select, Textarea,
    SegmentedControl, Badge, StatusPill, EmptyState, Skeleton,
} from '../../components/ui';
import { Shield, Sparkles, Plus, X, Layers, BookOpen, RefreshCw, Pencil } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import { generateReferenceCardsAI } from '../../services/geminiApi';
import {
    fetchReferenceCards, fetchPendingReferenceCards, fetchReferenceCardDebt,
    createReferenceCard, updateReferenceCard, deleteReferenceCard,
    approveReferenceCard, rejectReferenceCard, bulkApproveReferenceCards,
    intakeReferenceCards, fetchReferenceSources, createReferenceSource, deleteReferenceSource,
} from '../../services/dbQueries';

const SUBJECTS = ['Mathematics', 'ESAS', 'EE'];
const KINDS = [
    { value: 'constant', label: 'Constant' },
    { value: 'formula', label: 'Formula' },
    { value: 'concept', label: 'Concept' },
];
const PANELS = [
    { value: 'queue', label: 'Review queue' },
    { value: 'create', label: 'Add card' },
    { value: 'ai', label: 'AI generate' },
    { value: 'live', label: 'Live cards' },
    { value: 'sources', label: 'Sources' },
    { value: 'debt', label: 'Data debt' },
];

const EMPTY_FORM = {
    kind: 'constant', subject: 'EE', topic: '', name: '', symbol: '',
    formulaLatex: '', valueUnit: '', description: '', purposeExamTip: '',
    subtopicTag: '', dimensionless: false, sourceId: '', variables: [],
};

// Quick client-side completeness check for AI preview rows (display only —
// the server's /ai-intake gate is authoritative).
const quickMissing = (row) => {
    const missing = [];
    if (!row?.name) missing.push('name');
    if (!row?.description) missing.push('description');
    if (!row?.topic) missing.push('topic');
    if (row?.kind === 'formula' && !row?.formulaLatex) missing.push('formula');
    if (row?.kind === 'formula' && !(Array.isArray(row?.variables) && row.variables.length > 0)) missing.push('variables');
    if (row?.kind === 'constant' && !row?.valueUnit && !row?.dimensionless) missing.push('value/unit');
    return missing;
};

// Card row → form state (for editing pending/live cards).
const cardToForm = (card) => ({
    kind: card.kind, subject: card.subject, topic: card.topic?.name || '',
    name: card.name || '', symbol: card.symbol || '',
    formulaLatex: card.formulaLatex || '', valueUnit: card.valueUnit || '',
    description: card.description || '', purposeExamTip: card.purposeExamTip || '',
    subtopicTag: card.subtopicTag || '', dimensionless: !!card.dimensionless,
    sourceId: card.sourceId || '', variables: Array.isArray(card.variables) ? card.variables : [],
});

// Form state → API payload (empty strings become nulls).
const formToPayload = (f) => ({
    kind: f.kind, subject: f.subject, topic: f.topic,
    name: f.name.trim(), symbol: f.symbol.trim() || null,
    formulaLatex: f.formulaLatex.trim() || null, valueUnit: f.valueUnit.trim() || null,
    description: f.description.trim(), purposeExamTip: f.purposeExamTip.trim() || null,
    subtopicTag: f.subtopicTag.trim() || null, dimensionless: !!f.dimensionless,
    sourceId: f.sourceId || null,
    variables: f.variables.filter((v) => v.symbol?.trim() && v.meaning?.trim())
        .map((v) => ({ symbol: v.symbol.trim(), meaning: v.meaning.trim(), unit: v.unit?.trim() || null })),
});

// ── Shared card form (create + edit) ────────────────────────────────────────
function CardForm({ form, setForm, sources, dynamicTOS }) {
    const topics = dynamicTOS?.[form.subject] || [];
    const setF = (patch) => setForm((f) => ({ ...f, ...patch }));
    const setVar = (i, patch) => setForm((f) => ({
        ...f, variables: f.variables.map((v, idx) => (idx === i ? { ...v, ...patch } : v)),
    }));

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField label="Kind">
                    <Select value={form.kind} onChange={(e) => setF({ kind: e.target.value })}>
                        {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </Select>
                </FormField>
                <FormField label="Subject">
                    <Select value={form.subject} onChange={(e) => setF({ subject: e.target.value, topic: '' })}>
                        {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </FormField>
                <FormField label="Topic" required>
                    <Select value={form.topic} onChange={(e) => setF({ topic: e.target.value })}>
                        <option value="">Select a topic…</option>
                        {topics.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Name" required>
                    <Input value={form.name} onChange={(e) => setF({ name: e.target.value })} placeholder="e.g. Capacitive Reactance" />
                </FormField>
                <FormField label="Symbol (LaTeX ok)">
                    <Input value={form.symbol} onChange={(e) => setF({ symbol: e.target.value })} placeholder="e.g. X_c" />
                </FormField>
            </div>
            {form.kind !== 'constant' && (
                <FormField label={form.kind === 'formula' ? 'Formula (LaTeX)' : 'Defining relation (LaTeX, optional)'} required={form.kind === 'formula'}>
                    <Textarea value={form.formulaLatex} onChange={(e) => setF({ formulaLatex: e.target.value })} placeholder="e.g. $$X_c = \frac{1}{2\pi f C}$$" className="!min-h-16 font-mono text-xs" />
                </FormField>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label={form.kind === 'constant' ? 'Value + unit (LaTeX ok)' : 'Result unit (optional)'} required={form.kind === 'constant' && !form.dimensionless}>
                    <Input value={form.valueUnit} onChange={(e) => setF({ valueUnit: e.target.value })} placeholder="e.g. $8.854\times10^{-12}$ F/m" />
                </FormField>
                <FormField label="Finer subtopic tag (optional)" hint="A free label within the topic — not a taxonomy node.">
                    <Input value={form.subtopicTag} onChange={(e) => setF({ subtopicTag: e.target.value })} placeholder="e.g. Capacitance" />
                </FormField>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted2 cursor-pointer select-none">
                <input type="checkbox" checked={form.dimensionless} onChange={(e) => setF({ dimensionless: e.target.checked })} />
                Dimensionless / contextual — no numeric value required
            </label>
            <FormField label="Plain-language description" required>
                <Textarea value={form.description} onChange={(e) => setF({ description: e.target.value })} placeholder="What does this represent, in 1–3 sentences?" className="!min-h-16" />
            </FormField>
            <FormField label="Board use & common traps">
                <Textarea value={form.purposeExamTip} onChange={(e) => setF({ purposeExamTip: e.target.value })} placeholder="How it's applied in board problems + one trap to watch for." className="!min-h-16" />
            </FormField>

            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-eyebrow">Variables {form.kind === 'formula' ? '(must cover every symbol in the formula)' : '(optional)'}</span>
                    <Button size="sm" variant="ghost" onClick={() => setF({ variables: [...form.variables, { symbol: '', meaning: '', unit: '' }] })}>
                        <Plus size={14} strokeWidth={1.75} aria-hidden="true" /> Add variable
                    </Button>
                </div>
                {form.variables.length === 0 ? (
                    <p className="text-xs text-muted">No variables yet.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {form.variables.map((v, i) => (
                            <div key={i} className="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 items-center min-w-0">
                                <Input value={v.symbol} onChange={(e) => setVar(i, { symbol: e.target.value })} placeholder="f" aria-label={`Variable ${i + 1} symbol`} />
                                <Input value={v.meaning} onChange={(e) => setVar(i, { meaning: e.target.value })} placeholder="frequency" aria-label={`Variable ${i + 1} meaning`} />
                                <Input value={v.unit || ''} onChange={(e) => setVar(i, { unit: e.target.value })} placeholder="Hz" aria-label={`Variable ${i + 1} unit`} />
                                <Button size="icon" variant="ghost" tone="danger" aria-label={`Remove variable ${i + 1}`}
                                    onClick={() => setF({ variables: form.variables.filter((_, idx) => idx !== i) })}>
                                    <X size={14} strokeWidth={1.75} aria-hidden="true" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <FormField label="Source citation (optional)">
                <Select value={form.sourceId} onChange={(e) => setF({ sourceId: e.target.value })}>
                    <option value="">No source</option>
                    {sources.map((s) => <option key={s.id} value={s.id}>{s.title}{s.edition ? ` (${s.edition})` : ''}</option>)}
                </Select>
            </FormField>
        </div>
    );
}

export default function ReferenceAdminV2() {
    const dynamicTOS = useStore((s) => s.dynamicTOS);
    const [panel, setPanel] = useState('queue');
    const [busy, setBusy] = useState(false);

    // Shared data
    const [pending, setPending] = useState([]);
    const [live, setLive] = useState([]);
    const [sources, setSources] = useState([]);
    const [debt, setDebt] = useState(null);
    const [loadingPanel, setLoadingPanel] = useState(true);

    // Create/edit
    const [form, setForm] = useState(EMPTY_FORM);
    const [editing, setEditing] = useState(null); // card being edited (modal)
    const [editForm, setEditForm] = useState(EMPTY_FORM);

    // AI panel
    const [aiKind, setAiKind] = useState('formula');
    const [aiSubject, setAiSubject] = useState('EE');
    const [aiTopic, setAiTopic] = useState('');
    const [aiFocus, setAiFocus] = useState('');
    const [aiCount, setAiCount] = useState(6);
    const [aiRows, setAiRows] = useState([]);
    const [aiSelected, setAiSelected] = useState(new Set());

    // Bulk accept
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);
    const [isBulkApproving, setIsBulkApproving] = useState(false);

    // Sources form
    const [sourceForm, setSourceForm] = useState({ title: '', kind: '', edition: '', section: '', url: '' });

    // Panel data loads in the effect (state set only in promise callbacks —
    // react-hooks/set-state-in-effect compliant); the loading flip happens in
    // the EVENT handlers (panel switch / refresh), where sync setState is fine.
    const [panelTick, setPanelTick] = useState(0);
    const refreshPanel = useCallback(() => { setLoadingPanel(true); setPanelTick((t) => t + 1); }, []);
    const switchPanel = useCallback((p) => { setLoadingPanel(true); setPanel(p); }, []);

    useEffect(() => {
        let ignore = false;
        const jobs = [];
        if (panel === 'queue') jobs.push(fetchPendingReferenceCards().then((x) => { if (!ignore) setPending(x); }));
        if (panel === 'live') jobs.push(fetchReferenceCards().then((x) => { if (!ignore) setLive(x); }));
        if (panel === 'debt') jobs.push(fetchReferenceCardDebt().then((x) => { if (!ignore) setDebt(x); }));
        if (panel === 'sources' || panel === 'create' || panel === 'queue') {
            jobs.push(fetchReferenceSources().then((x) => { if (!ignore) setSources(x); }));
        }
        Promise.all(jobs)
            .catch(() => { if (!ignore) toast.error("Couldn't load this panel."); })
            .finally(() => { if (!ignore) setLoadingPanel(false); });
        return () => { ignore = true; };
    }, [panel, panelTick]);

    // ── Queue actions ──────────────────────────────────────────────────────
    const handleApprove = async (card) => {
        try {
            await approveReferenceCard(card.id);
            setPending((p) => p.filter((c) => c.id !== card.id));
            toast.success('Card approved and live.');
        } catch { toast.error('Approval failed.'); }
    };
    const handleReject = async (card) => {
        try {
            await rejectReferenceCard(card.id);
            setPending((p) => p.filter((c) => c.id !== card.id));
            toast.success('Card rejected.');
        } catch { toast.error('Reject failed.'); }
    };
    // Server response is the source of truth — approved leave, failures stay.
    const handleBulkApprove = async () => {
        const ids = pending.map((c) => c.id);
        if (ids.length === 0) { setShowBulkConfirm(false); return; }
        setIsBulkApproving(true);
        try {
            const res = await bulkApproveReferenceCards(ids);
            const approvedSet = new Set(res?.approved || []);
            setPending((p) => p.filter((c) => !approvedSet.has(c.id)));
            if (approvedSet.size > 0) toast.success(`${approvedSet.size} card${approvedSet.size === 1 ? '' : 's'} approved and live.`);
            const failedCount = (res?.failed || []).length;
            if (failedCount > 0) toast.error(`${failedCount} card${failedCount === 1 ? '' : 's'} failed and stay in the queue.`);
        } catch { toast.error('Bulk approval failed — nothing was removed.'); }
        finally { setIsBulkApproving(false); setShowBulkConfirm(false); }
    };

    // ── Create / edit / delete ─────────────────────────────────────────────
    const submitCreate = async () => {
        setBusy(true);
        try {
            await createReferenceCard(formToPayload(form));
            toast.success('Card created and live.');
            setForm(EMPTY_FORM);
        } catch (err) {
            toast.error(err?.body?.reasons ? `Incomplete: ${err.body.reasons.join(', ')}` : (err.message || 'Create failed.'));
        } finally { setBusy(false); }
    };
    const submitEdit = async () => {
        setBusy(true);
        try {
            const res = await updateReferenceCard(editing.id, formToPayload(editForm));
            toast.success('Card updated.');
            setPending((p) => p.map((c) => (c.id === editing.id ? (res?.item || c) : c)));
            setLive((p) => p.map((c) => (c.id === editing.id ? (res?.item || c) : c)));
            setEditing(null);
        } catch (err) {
            toast.error(err?.body?.reasons ? `Incomplete: ${err.body.reasons.join(', ')}` : (err.message || 'Update failed.'));
        } finally { setBusy(false); }
    };
    const handleDelete = async (card) => {
        if (!window.confirm(`Delete "${card.name}"? The audit history is kept.`)) return;
        try {
            await deleteReferenceCard(card.id);
            setLive((p) => p.filter((c) => c.id !== card.id));
            setPending((p) => p.filter((c) => c.id !== card.id));
            toast.success('Card deleted.');
        } catch { toast.error('Delete failed.'); }
    };

    // ── AI generation ──────────────────────────────────────────────────────
    const handleGenerate = async () => {
        if (!aiTopic) return toast.error('Pick a topic first.');
        setBusy(true);
        setAiRows([]); setAiSelected(new Set());
        const toastId = toast.loading('Generating flashcards…');
        try {
            // Exclusion list: everything already live or pending for this kind+subject.
            const [liveCards, pendingCards] = await Promise.all([
                live.length ? Promise.resolve(live) : fetchReferenceCards(),
                pending.length ? Promise.resolve(pending) : fetchPendingReferenceCards(),
            ]);
            const existing = [...liveCards, ...pendingCards]
                .filter((c) => c.kind === aiKind && c.subject === aiSubject)
                .map((c) => c.name);
            const rows = await generateReferenceCardsAI(aiKind, aiSubject, aiTopic, aiCount, existing, aiFocus.trim() || null);
            if (!rows.length) throw new Error('No cards returned.');
            setAiRows(rows);
            setAiSelected(new Set(rows.map((_, i) => i).filter((i) => quickMissing(rows[i]).length === 0)));
            toast.success(`Generated ${rows.length} — review and queue the complete ones.`, { id: toastId });
        } catch (err) {
            toast.error(err?.message === '[OFFLINE]' ? 'AI needs a connection.' : (err.message || 'Generation failed.'), { id: toastId });
        } finally { setBusy(false); }
    };
    const handleQueueSelected = async () => {
        const chosen = aiRows.filter((_, i) => aiSelected.has(i));
        if (chosen.length === 0) return toast.error('Select at least one complete card.');
        setBusy(true);
        const toastId = toast.loading(`Queueing ${chosen.length} for review…`);
        try {
            const res = await intakeReferenceCards(chosen);
            const queued = res?.queued?.length || 0;
            const rejected = res?.rejected?.length || 0;
            toast.success(`${queued} queued for review${rejected ? ` · ${rejected} rejected as incomplete` : ''}.`, { id: toastId });
            setAiRows([]); setAiSelected(new Set());
            if (panel === 'queue') refreshPanel();
        } catch (err) { toast.error(err.message || 'Intake failed.', { id: toastId }); }
        finally { setBusy(false); }
    };

    // ── Sources ────────────────────────────────────────────────────────────
    const submitSource = async () => {
        if (!sourceForm.title.trim()) return toast.error('Title is required.');
        setBusy(true);
        try {
            await createReferenceSource({
                title: sourceForm.title.trim(),
                kind: sourceForm.kind.trim() || null,
                edition: sourceForm.edition.trim() || null,
                section: sourceForm.section.trim() || null,
                url: sourceForm.url.trim() || null,
            });
            setSourceForm({ title: '', kind: '', edition: '', section: '', url: '' });
            setSources(await fetchReferenceSources());
            toast.success('Source added.');
        } catch (err) { toast.error(err.message || 'Failed to add the source.'); }
        finally { setBusy(false); }
    };

    const aiTopics = dynamicTOS?.[aiSubject] || [];
    const completeAiCount = useMemo(() => aiRows.filter((r) => quickMissing(r).length === 0).length, [aiRows]);

    const cardRow = (card, actions) => (
        <div key={card.id} className="bg-surface border border-border2 rounded-[var(--radius-lg)] p-4 flex flex-col gap-2 min-w-0">
            <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone="velocity" className="uppercase">{card.kind}</Badge>
                        <span className="font-bold text-sm text-textMain line-clamp-1 [overflow-wrap:anywhere]" title={card.name}>{card.name}</span>
                    </div>
                    <div className="text-eyebrow mt-1">{card.subject} • {card.topic?.name || 'no topic'}{card.subtopicTag ? ` • ${card.subtopicTag}` : ''}</div>
                </div>
                <div className="flex gap-2 shrink-0">{actions}</div>
            </div>
            {(card.formulaLatex || card.valueUnit) && (
                <div className="bg-bg border border-border rounded-[var(--radius-default)] px-3 py-2 math-scroll-mobile min-w-0 text-sm">
                    <LatexRenderer content={card.formulaLatex || card.valueUnit} />
                </div>
            )}
            <p className="text-xs text-muted2 line-clamp-2 [overflow-wrap:anywhere]">{card.description}</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-5 animate-in fade-in">
            <SegmentedControl label="Reference admin sections" size="sm" value={panel} onChange={switchPanel} options={PANELS} columns={3} className="self-start" />

            {loadingPanel && (
                <div className="flex flex-col gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
            )}

            {/* 1 ── REVIEW QUEUE */}
            {!loadingPanel && panel === 'queue' && (
                pending.length === 0 ? (
                    <EmptyState icon={Shield} title="No cards awaiting review"
                        description="AI-generated flashcards land here before going live. Generate some from the AI panel."
                        action={<Button size="sm" variant="secondary" onClick={refreshPanel}><RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" /> Refresh</Button>} />
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap border border-border bg-surface2/40 rounded-[var(--radius-default)] px-4 py-3">
                            <p className="text-xs text-muted2"><span className="font-bold text-textMain">{pending.length}</span> card{pending.length === 1 ? '' : 's'} pending (all passed the completeness gate at intake)</p>
                            <Button size="sm" tone="success" onClick={() => setShowBulkConfirm(true)} disabled={isBulkApproving}>
                                Accept all {pending.length}
                            </Button>
                        </div>
                        {pending.map((card) => cardRow(card, (
                            <>
                                <Button size="sm" variant="outline" onClick={() => { setEditing(card); setEditForm(cardToForm(card)); }}>Edit</Button>
                                <Button size="sm" variant="outline" tone="danger" onClick={() => handleReject(card)}>Reject</Button>
                                <Button size="sm" tone="success" onClick={() => handleApprove(card)}>Approve</Button>
                            </>
                        )))}
                    </div>
                )
            )}

            {/* 2 ── ADD CARD */}
            {!loadingPanel && panel === 'create' && (
                <div className="max-w-2xl flex flex-col gap-4">
                    <CardForm form={form} setForm={setForm} sources={sources} dynamicTOS={dynamicTOS} />
                    <Button onClick={submitCreate} loading={busy} disabled={busy} className="self-start">Create card (goes live)</Button>
                </div>
            )}

            {/* 3 ── AI GENERATE */}
            {!loadingPanel && panel === 'ai' && (
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                        <FormField label="Kind"><Select value={aiKind} onChange={(e) => setAiKind(e.target.value)}>{KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select></FormField>
                        <FormField label="Subject"><Select value={aiSubject} onChange={(e) => { setAiSubject(e.target.value); setAiTopic(''); }}>{SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></FormField>
                        <FormField label="Topic"><Select value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}><option value="">Select…</option>{aiTopics.map((t) => <option key={t} value={t}>{t}</option>)}</Select></FormField>
                        <FormField label="Specific focus (optional)"><Input value={aiFocus} onChange={(e) => setAiFocus(e.target.value)} placeholder="e.g. Capacitance" /></FormField>
                        <FormField label="Count"><Select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))}>{[3, 6, 10].map((n) => <option key={n} value={n}>{n}</option>)}</Select></FormField>
                    </div>
                    <Button onClick={handleGenerate} loading={busy} disabled={busy || !aiTopic} className="self-start">
                        <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" /> Generate complete flashcards
                    </Button>

                    {aiRows.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <p className="text-xs text-muted2">{completeAiCount} of {aiRows.length} generated card{aiRows.length === 1 ? '' : 's'} are complete — incomplete ones can't be queued.</p>
                                <Button size="sm" tone="success" onClick={handleQueueSelected} loading={busy} disabled={busy || aiSelected.size === 0}>
                                    Queue {aiSelected.size} for review
                                </Button>
                            </div>
                            {aiRows.map((row, i) => {
                                const missing = quickMissing(row);
                                const selectable = missing.length === 0;
                                return (
                                    <label key={i} className={`flex items-start gap-3 bg-surface border rounded-[var(--radius-lg)] p-4 min-w-0 ${selectable ? 'border-border2 cursor-pointer' : 'border-[color-mix(in_srgb,var(--accent-danger)_35%,transparent)] opacity-70'}`}>
                                        <input type="checkbox" className="mt-1" disabled={!selectable} checked={aiSelected.has(i)}
                                            onChange={() => setAiSelected((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-sm text-textMain [overflow-wrap:anywhere]">{row.name || 'Unnamed'}</span>
                                                {row.subtopicTag && <Badge tone="signal">{row.subtopicTag}</Badge>}
                                                {!selectable && <StatusPill tone="danger">Missing: {missing.join(', ')}</StatusPill>}
                                            </div>
                                            {(row.formulaLatex || row.valueUnit) && (
                                                <div className="mt-2 bg-bg border border-border rounded-[var(--radius-default)] px-3 py-2 math-scroll-mobile min-w-0 text-sm">
                                                    <LatexRenderer content={row.formulaLatex || row.valueUnit} />
                                                </div>
                                            )}
                                            <p className="text-xs text-muted2 mt-1 line-clamp-2 [overflow-wrap:anywhere]">{row.description}</p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* 4 ── LIVE CARDS */}
            {!loadingPanel && panel === 'live' && (
                live.length === 0 ? (
                    <EmptyState icon={BookOpen} title="No live cards yet" description="Approve cards from the review queue (or create one manually) and they appear here." />
                ) : (
                    <div className="flex flex-col gap-3">
                        <p className="text-eyebrow">{live.length} live card{live.length === 1 ? '' : 's'}</p>
                        {live.map((card) => cardRow(card, (
                            <>
                                <Button size="sm" variant="outline" onClick={() => { setEditing(card); setEditForm(cardToForm(card)); }}>Edit</Button>
                                <Button size="sm" variant="outline" tone="danger" onClick={() => handleDelete(card)}>Delete</Button>
                            </>
                        )))}
                    </div>
                )
            )}

            {/* 5 ── SOURCES */}
            {!loadingPanel && panel === 'sources' && (
                <div className="flex flex-col gap-4 max-w-2xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField label="Title" required><Input value={sourceForm.title} onChange={(e) => setSourceForm((s) => ({ ...s, title: e.target.value }))} placeholder="e.g. Philippine Electrical Code" /></FormField>
                        <FormField label="Kind"><Input value={sourceForm.kind} onChange={(e) => setSourceForm((s) => ({ ...s, kind: e.target.value }))} placeholder="code / textbook / standard" /></FormField>
                        <FormField label="Edition"><Input value={sourceForm.edition} onChange={(e) => setSourceForm((s) => ({ ...s, edition: e.target.value }))} placeholder="2017" /></FormField>
                        <FormField label="Section"><Input value={sourceForm.section} onChange={(e) => setSourceForm((s) => ({ ...s, section: e.target.value }))} placeholder="PEC 2.10.1.2" /></FormField>
                    </div>
                    <Button onClick={submitSource} loading={busy} disabled={busy} className="self-start"><Plus size={14} strokeWidth={1.75} aria-hidden="true" /> Add source</Button>
                    {sources.length === 0 ? (
                        <p className="text-xs text-muted">No sources yet — add the references your card values cite so they stay traceable when a standard revises.</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {sources.map((s) => (
                                <div key={s.id} className="flex items-center justify-between gap-3 bg-surface border border-border2 rounded-[var(--radius-default)] px-4 py-2.5 min-w-0">
                                    <div className="min-w-0">
                                        <span className="text-sm font-bold text-textMain truncate block" title={s.title}>{s.title}{s.edition ? ` (${s.edition})` : ''}</span>
                                        <span className="text-eyebrow">{[s.kind, s.section].filter(Boolean).join(' • ') || '—'}</span>
                                    </div>
                                    <Button size="icon" variant="ghost" tone="danger" aria-label={`Delete source ${s.title}`}
                                        onClick={async () => { if (window.confirm(`Delete source "${s.title}"? Cards keep living without the citation.`)) { await deleteReferenceSource(s.id).catch(() => toast.error('Delete failed.')); setSources(await fetchReferenceSources()); } }}>
                                        <X size={14} strokeWidth={1.75} aria-hidden="true" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 6 ── DATA DEBT */}
            {!loadingPanel && panel === 'debt' && (
                !debt || debt.items?.length === 0 ? (
                    <EmptyState icon={Layers} title="No data debt"
                        description={`Every card (${debt?.checked ?? 0} checked) passes the required-field rules. Incomplete cards can't be created going forward.`} />
                ) : (
                    <div className="flex flex-col gap-3">
                        <p className="text-xs text-muted2"><span className="font-bold text-textMain">{debt.items.length}</span> of {debt.checked} cards are incomplete — fix them via Edit so the vault stays trustworthy.</p>
                        {debt.items.map(({ card, reasons }) => cardRow(card, (
                            <>
                                <StatusPill tone="danger">{reasons.join(' · ')}</StatusPill>
                                <Button size="sm" variant="outline" onClick={() => { setEditing(card); setEditForm(cardToForm(card)); }}>Fix</Button>
                            </>
                        )))}
                    </div>
                )
            )}

            {/* Edit modal (pending, live, or debt cards) */}
            <Modal open={!!editing} onClose={() => !busy && setEditing(null)} size="lg" icon={Pencil} title={editing ? `Edit: ${editing.name}` : 'Edit card'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
                        <Button onClick={submitEdit} loading={busy} disabled={busy}>Save changes</Button>
                    </>
                }>
                {editing && <CardForm form={editForm} setForm={setEditForm} sources={sources} dynamicTOS={dynamicTOS} />}
            </Modal>

            {/* Accept-All confirmation */}
            <Modal open={showBulkConfirm} onClose={() => !isBulkApproving && setShowBulkConfirm(false)} tone="amber" icon={Shield}
                title={`Approve all ${pending.length} pending card${pending.length === 1 ? '' : 's'}?`}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowBulkConfirm(false)} disabled={isBulkApproving}>Cancel</Button>
                        <Button tone="success" onClick={handleBulkApprove} loading={isBulkApproving} disabled={isBulkApproving || pending.length === 0}>Approve {pending.length}</Button>
                    </>
                }>
                <p className="text-sm text-muted2">
                    This publishes them to every user's reference vault immediately. The server re-checks
                    each card's completeness — anything failing stays in the queue. Every approval is logged.
                </p>
            </Modal>
        </div>
    );
}
