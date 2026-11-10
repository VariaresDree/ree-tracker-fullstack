// src/features/reference/ReferenceAdminV2.jsx
// Admin › Formula cards, in four sections (seven until 2026-11-10):
//   1. Review — AI-submitted cards, per-card approve/reject/edit + the
//      same confirmation-gated "Accept All" pattern as the question queue.
//   2. Cards — every published card by subject and topic, as learners find
//      them, with Needs fixing (the required-field report) and Retired as
//      filters and tag renames under each topic (admin/CardsPanel.jsx).
//   3. Add — AI generation (from a topic, a reviewer file, or another AI's
//      reply; rows previewed with per-row completeness, only complete rows
//      queued, re-validated by the server) and writing one by hand through
//      the full required-field gate.
//   4. Sources — CRUD over the authoritative citations (textbook/code/PEC).
// Cards are formulas and constants only (2026-10-31).
import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import {
    Button, Card, Modal, FormField, Input, Select, Textarea,
    SegmentedControl, Badge, StatusPill, EmptyState, Skeleton,
} from '../../components/ui';
import { Shield, Sparkles, Plus, X, RefreshCw, Pencil, Copy, Trash2 } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import { withMathDelimiters } from '../../utils/mathDelimiters';
import { isKnownTopic, labelForGenerated } from '../../utils/topicLabels';
import { refreshLiveTOS } from '../../services/liveTaxonomy';
import Flashcard from './Flashcard';
import CardsPanel from './admin/CardsPanel';
import { SYLLABUS_SUBJECTS as SUBJECTS } from '@ree/shared';
import { cardReasonWords } from './cardReasons';
import { buildCardImportPrompt, MAX_PER_MESSAGE } from '../../services/externalPrompts';
import { parseExchange } from '../admin/exchange/aiExchange';
import { copyText } from '../exam-export/deliver';
import { generateReferenceCardsAI, generateReferenceCardsFromSource } from '../../services/geminiApi';
import { readPdfText } from '../library/readPdfText';
import AiStatusNote from '../../components/AiStatusNote';
import {
    fetchReferenceCards, fetchPendingReferenceCards, fetchReferenceCardDebt,
    createReferenceCard, updateReferenceCard, deleteReferenceCard,
    approveReferenceCard, rejectReferenceCard, bulkApproveReferenceCards, fetchRetiredReferenceCards,
    intakeReferenceCards, renameReferenceTag, fetchReferenceSources, createReferenceSource, deleteReferenceSource,
} from '../../services/dbQueries';

const KINDS = [
    { value: 'formula', label: 'Formula' },
    { value: 'constant', label: 'Constant' },
];
// Add: write cards for a topic, read them out of a reviewer or another AI's reply, or write one by hand.
const AI_SOURCES = [
    { value: 'topic', label: 'From a topic' },
    { value: 'file', label: 'From a file' },
    { value: 'paste', label: 'From another AI' },
    { value: 'manual', label: 'Write one' },
];
const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_IMAGES = 6;
const PDF_PAGES = 40;
const nameKey = (n) => String(n || '').toLowerCase().trim();

const PANELS = [
    { value: 'queue', label: 'Review' },
    { value: 'cards', label: 'Cards' },
    { value: 'add', label: 'Add' },
    { value: 'sources', label: 'Sources' },
];

const EMPTY_FORM = {
    kind: 'constant', subject: 'EE', topic: '', name: '', symbol: '',
    formulaLatex: '', valueUnit: '', description: '', purposeExamTip: '',
    subtopicTag: '', dimensionless: false, sourceId: '', variables: [],
};

// Quick client-side completeness check for AI preview rows (display only —
// the server's /ai-intake gate is authoritative).
const quickMissing = (row, tos) => {
    const missing = [];
    if (!row?.name) missing.push('name');
    if (!row?.description) missing.push('description');
    // A draft's topic is the model's label: it has to be on the live syllabus,
    // or the server refuses it. A stored card's is already a Topic.
    if (!row?.topic || (typeof row.topic === 'string' && !isKnownTopic(row.topic, tos?.[row.subject]))) missing.push('topic');
    if (row?.kind === 'formula' && !row?.formulaLatex) missing.push('formula');
    if (row?.kind === 'formula' && !(Array.isArray(row?.variables) && row.variables.length > 0)) missing.push('variables');
    if (row?.kind === 'constant' && !row?.valueUnit && !row?.dimensionless) missing.push('value/unit');
    return missing;
};

// Card row → form state (for editing pending/live cards). A retired concept
// card opens as a formula: saving it re-types it.
const cardToForm = (card) => ({
    kind: card.kind === 'concept' ? 'formula' : card.kind, subject: card.subject,
    topic: (typeof card.topic === 'string' ? card.topic : card.topic?.name) || '',
    name: card.name || '', symbol: card.symbol || '',
    formulaLatex: card.formulaLatex || '', valueUnit: card.valueUnit || '',
    description: card.description || '', purposeExamTip: card.purposeExamTip || '',
    subtopicTag: card.subtopicTag || '', dimensionless: !!card.dimensionless,
    sourceId: card.sourceId || '', variables: Array.isArray(card.variables) ? card.variables : [],
});

// Form state → API payload (empty strings become nulls).
// Names already taken, as positions in `rows`.
const repeatedRows = (rows, names) => {
    const known = new Set(names.map(nameKey));
    return new Set(rows.map((r, i) => (known.has(nameKey(r.name)) ? i : -1)).filter((i) => i >= 0));
};

// Tags in use under a topic, for suggestions: one tag, spelled one way.
const tagsIn = (cards, subject, topic) => [...new Map(cards
    .filter((c) => c.subtopicTag && c.subject === subject && c.topic?.name === topic)
    .map((c) => [c.subtopicTag.trim().toLowerCase(), c.subtopicTag.trim()])).values()].sort();

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
function CardForm({ form, setForm, sources, dynamicTOS, cards = [] }) {
    const topics = dynamicTOS?.[form.subject] || [];
    const tags = tagsIn(cards, form.subject, form.topic);
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
                <FormField label="Formula (LaTeX)" required>
                    <Textarea value={form.formulaLatex} onChange={(e) => setF({ formulaLatex: e.target.value })} placeholder="e.g. $$X_c = \frac{1}{2\pi f C}$$" className="!min-h-16 font-mono text-xs" />
                </FormField>
            )}
            {form.kind !== 'constant' && form.formulaLatex.trim() && (
                <div className="bg-bg border border-border rounded-[var(--radius-default)] px-3 py-2 math-scroll-mobile min-w-0 text-sm">
                    <LatexRenderer content={withMathDelimiters(form.formulaLatex)} />
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label={form.kind === 'constant' ? 'Value + unit (LaTeX ok)' : 'Result unit (optional)'} required={form.kind === 'constant' && !form.dimensionless}>
                    <Input value={form.valueUnit} onChange={(e) => setF({ valueUnit: e.target.value })} placeholder="e.g. $8.854\times10^{-12}$ F/m" />
                </FormField>
                <FormField label="Tag (optional)" hint="The family of cards this belongs to, in 2 to 4 words, such as AC Power. Reuse a tag when one fits.">
                    <Input value={form.subtopicTag} onChange={(e) => setF({ subtopicTag: e.target.value })} placeholder="e.g. Capacitance" list="card-tags" />
                </FormField>
            </div>
            <datalist id="card-tags">{tags.map((t) => <option key={t} value={t} />)}</datalist>
            {form.valueUnit.trim() && (
                <div className="text-sm text-textMain math-scroll-mobile min-w-0 [&_p]:!mb-0">
                    <LatexRenderer content={withMathDelimiters(form.valueUnit)} />
                </div>
            )}
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
                    <span className="text-eyebrow">Variables {form.kind === 'formula' ? '(every symbol in the formula)' : '(optional)'}</span>
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
    // From a file: the reviewer, and the names already in the library (live
    // or pending) so a draft that repeats one is flagged instead of queued.
    const [aiSource, setAiSource] = useState('topic');
    const [aiFiles, setAiFiles] = useState([]);
    const [aiDuplicates, setAiDuplicates] = useState(new Set());
    // Why the server refused a row, by its position in aiRows.
    const [aiRefusals, setAiRefusals] = useState({});
    // From another AI: its reply, and what couldn't be read from it.
    const [aiReply, setAiReply] = useState('');
    const [aiReplyProblems, setAiReplyProblems] = useState([]);
    const [retired, setRetired] = useState([]);
    const [renaming, setRenaming] = useState(null); // { subject, topic, from, to }
    const [deleting, setDeleting] = useState(null); // the card a delete waits to confirm

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
        // Live cards too wherever a card can be edited: its tag suggestions.
        if (panel !== 'sources') jobs.push(fetchReferenceCards().then((x) => { if (!ignore) setLive(x); }));
        if (panel === 'cards') {
            jobs.push(fetchRetiredReferenceCards().then((x) => { if (!ignore) setRetired(x); }));
            jobs.push(fetchReferenceCardDebt().then((x) => { if (!ignore) setDebt(x); }));
        }
        if (panel === 'sources' || panel === 'add' || panel === 'queue') {
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
        if (!window.confirm(`Reject "${card.name}"? It leaves the queue. A card of the same name can be queued again later.`)) return;
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
        // A draft isn't saved anywhere yet: the edit changes the row on screen.
        if (editing.draftIndex !== undefined) {
            const i = editing.draftIndex;
            setAiRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...formToPayload(editForm) } : r)));
            setAiRefusals((prev) => { const n = { ...prev }; delete n[i]; return n; });
            setAiDuplicates((prev) => { const n = new Set(prev); n.delete(i); return n; });
            setAiSelected((prev) => new Set(prev).add(i));
            setEditing(null);
            return;
        }
        setBusy(true);
        try {
            const res = await updateReferenceCard(editing.id, formToPayload(editForm));
            toast.success('Card updated.');
            setPending((p) => p.map((c) => (c.id === editing.id ? (res?.item || c) : c)));
            setLive((p) => p.map((c) => (c.id === editing.id ? (res?.item || c) : c)));
            // Saved through the required-field gate, so it no longer needs fixing.
            setDebt((d) => (d ? { ...d, items: (d.items || []).filter((x) => x.card?.id !== editing.id) } : d));
            // A retired concept card saved as a formula or constant is live again.
            if (editing.kind === 'concept' && res?.item) {
                setRetired((p) => p.filter((c) => c.id !== editing.id));
                setLive((p) => [res.item, ...p.filter((c) => c.id !== editing.id)]);
            }
            setEditing(null);
        } catch (err) {
            toast.error(err?.body?.reasons ? `Incomplete: ${err.body.reasons.join(', ')}` : (err.message || 'Update failed.'));
        } finally { setBusy(false); }
    };
    const confirmDelete = async () => {
        const card = deleting;
        setBusy(true);
        try {
            await deleteReferenceCard(card.id);
            setLive((p) => p.filter((c) => c.id !== card.id));
            setPending((p) => p.filter((c) => c.id !== card.id));
            setRetired((p) => p.filter((c) => c.id !== card.id));
            setDebt((d) => (d ? { ...d, items: (d.items || []).filter((x) => x.card?.id !== card.id) } : d));
            toast.success('Card deleted.');
            setDeleting(null);
        } catch { toast.error('Delete failed.'); }
        finally { setBusy(false); }
    };
    const openEditor = (card) => { setEditing(card); setEditForm(cardToForm(card)); };

    // ── AI generation ──────────────────────────────────────────────────────
    const clearDrafts = () => { setAiRows([]); setAiSelected(new Set()); setAiDuplicates(new Set()); setAiRefusals({}); };
    // What's in the library this moment, and the live syllabus: pending cards
    // change as rows are queued, and a stale list let a repeat through.
    const libraryNow = async () => {
        const [liveCards, pendingCards] = await Promise.all([fetchReferenceCards(), fetchPendingReferenceCards(), refreshLiveTOS()]);
        const cards = [...liveCards, ...pendingCards];
        return { cards, tags: [...new Set(cards.filter((c) => c.subject === aiSubject && c.subtopicTag).map((c) => c.subtopicTag.trim()))] };
    };
    const showDrafts = (rows, existing) => {
        const dupes = repeatedRows(rows, existing);
        setAiRows(rows);
        setAiDuplicates(dupes);
        setAiSelected(new Set(rows.map((_, i) => i).filter((i) => !dupes.has(i) && quickMissing(rows[i], dynamicTOS).length === 0)));
    };
    const handleGenerate = async () => {
        if (!aiTopic) return toast.error('Pick a topic first.');
        setBusy(true);
        clearDrafts();
        const toastId = toast.loading('Generating flashcards…');
        try {
            // Exclusion list: everything already live or pending for this kind+subject.
            const { cards, tags } = await libraryNow();
            const existing = cards.filter((c) => c.kind === aiKind && c.subject === aiSubject).map((c) => c.name);
            const rows = await generateReferenceCardsAI(aiKind, aiSubject, aiTopic, aiCount, existing, aiFocus.trim() || null,
                (n, of) => { if (of > 1) toast.loading(`Writing cards, part ${n} of ${of}…`, { id: toastId }); }, tags);
            if (!rows.length) throw new Error('No cards returned.');
            showDrafts(rows, existing);
            toast.success(`Generated ${rows.length} — review and queue the complete ones.`, { id: toastId });
        } catch (err) {
            toast.error(err?.message === '[OFFLINE]' ? 'AI needs a connection.' : (err.message || 'Generation failed.'), { id: toastId });
        } finally { setBusy(false); }
    };
    const pickFiles = (e) => {
        const files = [...(e.target.files || [])].filter((f) => FILE_TYPES.includes(f.type));
        const pdf = files.find((f) => f.type === 'application/pdf');
        // One PDF, or up to MAX_FILE_IMAGES photos of pages.
        setAiFiles(pdf ? [pdf] : files.slice(0, MAX_FILE_IMAGES));
        if (!files.length && e.target.files?.length) toast.error('Use a PDF, or JPG, PNG or WebP photos.');
    };
    const handleFromFile = async () => {
        if (!aiFiles.length) return toast.error('Choose a PDF or photos first.');
        setBusy(true);
        clearDrafts();
        const toastId = toast.loading('Reading the file…');
        try {
            const { cards, tags } = await libraryNow();
            const existing = cards.filter((c) => c.subject === aiSubject).map((c) => c.name);
            const isPdf = aiFiles[0].type === 'application/pdf';
            const text = isPdf ? await readPdfText(aiFiles[0], { maxPages: PDF_PAGES, onProgress: (m) => toast.loading(m, { id: toastId }) }) : '';
            const rows = await generateReferenceCardsFromSource(
                { subject: aiSubject, topic: aiTopic || null, topics: aiTopics, text, images: isPdf ? [] : aiFiles, existingNames: existing, existingTags: tags },
                (n, of) => toast.loading(of > 1 ? `Finding formulas and constants, part ${n} of ${of}…` : 'Finding formulas and constants…', { id: toastId }),
            );
            if (!rows.length) throw new Error('No formulas or constants found in that file.');
            showDrafts(rows, existing);
            toast.success(`Found ${rows.length} — review and queue the complete ones.`, { id: toastId });
        } catch (err) {
            toast.error(err?.message === '[OFFLINE]' ? 'AI needs a connection.' : (err.message || "Couldn't make cards from that file."), { id: toastId });
        } finally { setBusy(false); }
    };
    const copyCardPrompt = async () => {
        const inSubject = live.filter((c) => c.subject === aiSubject);
        const ok = await copyText(buildCardImportPrompt({
            subject: aiSubject, topic: aiTopic || null, topics: aiTopics, count: aiCount,
            existingNames: inSubject.map((c) => c.name),
            existingTags: [...new Set(inSubject.filter((c) => c.subtopicTag).map((c) => c.subtopicTag.trim()))],
        }));
        if (ok) toast.success('Prompt copied. Paste it into the other AI.');
        else toast.error("Couldn't copy. Allow clipboard access and try again.");
    };
    const readCardReply = async () => {
        const { cards, problems } = parseExchange(aiReply);
        const rows = cards.map((c) => ({ ...c, subject: c.subject || aiSubject, topic: labelForGenerated(c.topic, { target: aiTopic || 'All', topics: dynamicTOS?.[c.subject || aiSubject] }) }));
        setAiReplyProblems(problems);
        clearDrafts();
        if (!rows.length) return;
        setBusy(true);
        try {
            const { cards: library } = await libraryNow();
            showDrafts(rows, library.map((c) => c.name));
            setAiReply('');
        } catch (err) {
            toast.error(err.message || "Couldn't check the library.");
        } finally { setBusy(false); }
    };
    const handleQueueSelected = async () => {
        const chosen = aiRows.filter((_, i) => aiSelected.has(i));
        if (chosen.length === 0) return toast.error('Select at least one complete card.');
        const key = crypto?.randomUUID?.() ?? String(Date.now());
        setBusy(true);
        const toastId = toast.loading(`Queueing ${chosen.length} for review…`);
        try {
            const res = await intakeReferenceCards(chosen, { idempotencyKey: key });
            const queued = res?.queued?.length || 0;
            const refused = res?.rejected || [];
            // A refused row stays, with why, to fix here rather than generate again.
            const fix = refused.length ? `${refused.length} need${refused.length === 1 ? 's' : ''} a fix, listed below` : '';
            if (queued) toast.success(`${queued} queued for review${fix ? ` · ${fix}` : ''}.`, { id: toastId });
            else toast.error(`Nothing queued · ${fix}.`, { id: toastId });
            const kept = refused.map((r) => chosen[r.index]);
            setAiRows(kept);
            setAiRefusals(Object.fromEntries(refused.map((r, i) => [i, r.reasons])));
            setAiDuplicates(new Set());
            setAiSelected(new Set());
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
    const completeAiCount = useMemo(() => aiRows.filter((r) => quickMissing(r, dynamicTOS).length === 0).length, [aiRows, dynamicTOS]);

    const submitRename = async () => {
        if (!renaming?.to?.trim()) return toast.error('Type the new tag.');
        setBusy(true);
        try {
            const { to, ...rest } = renaming;
            const res = await renameReferenceTag({ ...rest, to: to.trim() });
            toast.success(`${res?.updated ?? 0} card${res?.updated === 1 ? '' : 's'} updated.`);
            setRenaming(null);
            refreshPanel();
        } catch (err) { toast.error(err.message || "Couldn't rename the tag."); }
        finally { setBusy(false); }
    };

    return (
        <div className="flex flex-col gap-5 animate-in fade-in">
            <SegmentedControl label="Reference admin sections" size="sm" value={panel} onChange={switchPanel} options={PANELS} className="self-start" />

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
                        {/* The real card, front and back, as learners will get it. */}
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5 items-start">
                            {pending.map((card) => (
                                <div key={card.id} className="flex flex-col gap-2 min-w-0">
                                    <Flashcard card={card} />
                                    {card.topic?.name && <p className="text-xs text-muted2">{card.subject} · {card.topic.name}</p>}
                                    {card.uncovered?.length > 0 && (
                                        <StatusPill tone="warning">Check the variables: {card.uncovered.join(', ')}</StatusPill>
                                    )}
                                    <div className="flex gap-2 flex-wrap">
                                        <Button size="sm" variant="outline" onClick={() => { setEditing(card); setEditForm(cardToForm(card)); }}>Edit</Button>
                                        <Button size="sm" variant="outline" tone="danger" onClick={() => handleReject(card)}>Reject</Button>
                                        <Button size="sm" tone="success" onClick={() => handleApprove(card)}>Approve</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            )}

            {/* 2 ── CARDS */}
            {!loadingPanel && panel === 'cards' && (
                <CardsPanel live={live} retired={retired} debt={debt?.items || []} dynamicTOS={dynamicTOS}
                    onEdit={openEditor} onDelete={setDeleting}
                    onRenameTag={(tag) => setRenaming({ ...tag, to: tag.from })} />
            )}

            {/* 3 ── ADD: by AI, or by hand */}
            {!loadingPanel && panel === 'add' && (
                <div className="flex flex-col gap-4">
                    <SegmentedControl label="Make cards" size="sm" value={aiSource} onChange={(v) => { setAiSource(v); clearDrafts(); }} options={AI_SOURCES} className="self-start" />
                    {aiSource === 'manual' ? (
                        <div className="max-w-2xl flex flex-col gap-4">
                            <CardForm form={form} setForm={setForm} sources={sources} dynamicTOS={dynamicTOS} cards={live} />
                            <Button onClick={submitCreate} loading={busy} disabled={busy} className="self-start">Create card (goes live)</Button>
                        </div>
                    ) : aiSource === 'topic' ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                                <FormField label="Kind"><Select value={aiKind} onChange={(e) => setAiKind(e.target.value)}>{KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select></FormField>
                                <FormField label="Subject"><Select value={aiSubject} onChange={(e) => { setAiSubject(e.target.value); setAiTopic(''); }}>{SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></FormField>
                                <FormField label="Topic"><Select value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}><option value="">Select…</option>{aiTopics.map((t) => <option key={t} value={t}>{t}</option>)}</Select></FormField>
                                <FormField label="Specific focus (optional)"><Input value={aiFocus} onChange={(e) => setAiFocus(e.target.value)} placeholder="e.g. Capacitance" /></FormField>
                                <FormField label="Count"><Select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))}>{[3, 6, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}</Select></FormField>
                            </div>
                            <p className="text-xs text-muted2 max-w-2xl">
                                Written by the most accurate model available (see Admin › AI models), told to use standard reference values and to leave out anything it isn't sure of. Every card still waits in the review queue.
                            </p>
                            <AiStatusNote task="author" />
                            <Button onClick={handleGenerate} loading={busy} disabled={busy || !aiTopic} className="self-start">
                                <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" /> Generate {aiCount} {aiKind === 'constant' ? 'constant' : 'formula'} card{aiCount === 1 ? '' : 's'}
                            </Button>
                        </>
                    ) : aiSource === 'paste' ? (
                        <>
                            <p className="text-xs text-muted2 max-w-2xl">
                                Use Claude, ChatGPT or Gemini in their own apps: copy this prompt into one, optionally attach a reviewer, then paste its reply. Cards already in the library are flagged, and every card still waits in the review queue.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <FormField label="Subject"><Select value={aiSubject} onChange={(e) => { setAiSubject(e.target.value); setAiTopic(''); }}>{SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></FormField>
                                <FormField label="Topic"><Select value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}><option value="">Any topic (the AI files each card)</option>{aiTopics.map((t) => <option key={t} value={t}>{t}</option>)}</Select></FormField>
                                <FormField label="How many" hint={`At most ${MAX_PER_MESSAGE} per message`}><Select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))}>{[6, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}</Select></FormField>
                            </div>
                            <Button variant="secondary" onClick={copyCardPrompt} className="self-start"><Copy size={14} strokeWidth={1.75} aria-hidden="true" /> Copy prompt</Button>
                            <FormField label="The AI's reply" hint="Use the copy button on its code block, so the LaTeX comes across as written.">
                                <Textarea value={aiReply} onChange={(e) => setAiReply(e.target.value)} className="!min-h-32 font-mono text-xs" placeholder="===CARD===" />
                            </FormField>
                            <Button onClick={readCardReply} loading={busy} disabled={busy || !aiReply.trim()} className="self-start">Read the reply</Button>
                            {aiReplyProblems.map((p) => <p key={p} role="alert" className="text-xs" style={{ color: 'var(--accent-danger)' }}>{p}</p>)}
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <FormField label="Subject"><Select value={aiSubject} onChange={(e) => { setAiSubject(e.target.value); setAiTopic(''); }}>{SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></FormField>
                                <FormField label="Topic"><Select value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}><option value="">Any topic (the AI files each card)</option>{aiTopics.map((t) => <option key={t} value={t}>{t}</option>)}</Select></FormField>
                                <FormField label="Reviewer file" hint={`One PDF (first ${PDF_PAGES} pages), or up to ${MAX_FILE_IMAGES} photos of its pages`}>
                                    <Input type="file" accept={FILE_TYPES.join(',')} multiple onChange={pickFiles} aria-label="Reviewer file" />
                                </FormField>
                            </div>
                            <p className="text-xs text-muted2 max-w-2xl">
                                Reads every formula and constant in a reviewer you have, with its variables, units and a board tip, into draft cards. Photos of formula pages read better than a PDF, whose text loses the layout of its math. Cards already in the library are flagged, and every card still waits in the review queue.
                            </p>
                            <AiStatusNote task={aiFiles[0]?.type?.startsWith('image/') ? 'vision' : 'author'} />
                            <Button onClick={handleFromFile} loading={busy} disabled={busy || !aiFiles.length} className="self-start">
                                <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" /> Make cards from {aiFiles.length > 1 ? `${aiFiles.length} photos` : aiFiles[0]?.name || 'the file'}
                            </Button>
                        </>
                    )}

                    {aiRows.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <p className="text-xs text-muted2">{completeAiCount} of {aiRows.length} card{aiRows.length === 1 ? '' : 's'} complete. Edit a row to fix it without generating again.</p>
                                <Button size="sm" tone="success" onClick={handleQueueSelected} loading={busy} disabled={busy || aiSelected.size === 0}>
                                    Queue {aiSelected.size} for review
                                </Button>
                            </div>
                            {aiRows.map((row, i) => {
                                const missing = quickMissing(row, dynamicTOS);
                                const duplicate = aiDuplicates.has(i);
                                const selectable = missing.length === 0 && !duplicate;
                                const refusals = aiRefusals[i] || [];
                                return (
                                    <label key={i} className={`flex items-start gap-3 bg-surface border rounded-[var(--radius-lg)] p-4 min-w-0 ${selectable ? 'border-border2 cursor-pointer' : 'border-[color-mix(in_srgb,var(--accent-danger)_35%,transparent)] opacity-70'}`}>
                                        <input type="checkbox" className="mt-1" disabled={!selectable} checked={aiSelected.has(i)}
                                            onChange={() => setAiSelected((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-sm text-textMain [overflow-wrap:anywhere]">{row.name || 'Unnamed'}</span>
                                                {row.subtopicTag && <Badge tone="signal">{row.subtopicTag}</Badge>}
                                                {missing.length > 0 && <StatusPill tone="danger">Missing: {missing.join(', ')}</StatusPill>}
                                                {duplicate && <StatusPill tone="warning">Already a card</StatusPill>}
                                                {aiSource === 'file' && row.topic && <Badge tone="neutral">{row.topic}</Badge>}
                                            </div>
                                            {(row.formulaLatex || row.valueUnit) && (
                                                <div className="mt-2 bg-bg border border-border rounded-[var(--radius-default)] px-3 py-2 math-scroll-mobile min-w-0 text-sm">
                                                    {/* Defensive, same as cardRow below: the generation prompt asks
                                                        for $-delimited output, but an occasional model slip
                                                        shouldn't show raw LaTeX in the pre-queue preview. */}
                                                    <LatexRenderer content={withMathDelimiters(row.formulaLatex || row.valueUnit)} />
                                                </div>
                                            )}
                                            <div className="text-xs text-muted2 mt-1 line-clamp-2 [overflow-wrap:anywhere] [&_p]:!m-0">
                                                <LatexRenderer content={row.description} />
                                            </div>
                                            {refusals.map((reason) => (
                                                <p key={reason} className="text-xs mt-1" style={{ color: 'var(--accent-danger)' }}>{cardReasonWords(reason)}</p>
                                            ))}
                                        </div>
                                        <Button size="sm" variant="outline" aria-label={`Edit ${row.name || 'this card'}`}
                                            onClick={(e) => { e.preventDefault(); setEditing({ name: row.name, draftIndex: i }); setEditForm(cardToForm({ ...row, subject: row.subject || aiSubject })); }}>
                                            <Pencil size={14} strokeWidth={1.75} aria-hidden="true" /> Edit
                                        </Button>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* 4 ── SOURCES */}
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
                                <Card key={s.id} variant="inset" className="flex items-center justify-between gap-3 px-4 py-2.5 min-w-0">
                                    <div className="min-w-0">
                                        <span className="text-sm font-bold text-textMain truncate block" title={s.title}>{s.title}{s.edition ? ` (${s.edition})` : ''}</span>
                                        <span className="text-eyebrow">{[s.kind, s.section].filter(Boolean).join(' • ') || '—'}</span>
                                    </div>
                                    <Button size="icon" variant="ghost" tone="danger" aria-label={`Delete source ${s.title}`}
                                        onClick={async () => { if (window.confirm(`Delete source "${s.title}"? Cards keep living without the citation.`)) { await deleteReferenceSource(s.id).catch(() => toast.error('Delete failed.')); setSources(await fetchReferenceSources()); } }}>
                                        <X size={14} strokeWidth={1.75} aria-hidden="true" />
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Edit modal (pending, live, retired, or a draft) */}
            <Modal open={!!editing} onClose={() => !busy && setEditing(null)} size="lg" icon={Pencil} title={editing ? `Edit: ${editing.name}` : 'Edit card'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
                        <Button onClick={submitEdit} loading={busy} disabled={busy}>Save changes</Button>
                    </>
                }>
                {editing && <CardForm form={editForm} setForm={setEditForm} sources={sources} dynamicTOS={dynamicTOS} cards={live} />}
            </Modal>

            {/* Delete a published card */}
            <Modal open={!!deleting} onClose={() => !busy && setDeleting(null)} tone="danger" icon={Trash2} title={deleting ? `Delete "${deleting.name}"?` : 'Delete card'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleting(null)} disabled={busy}>Cancel</Button>
                        <Button tone="danger" onClick={confirmDelete} loading={busy} disabled={busy}>Delete</Button>
                    </>
                }>
                <p className="text-sm text-muted2">Every learner's review progress on this card is lost. The audit history is kept. To change the card, use Edit instead.</p>
            </Modal>

            {/* Rename or merge a tag */}
            <Modal open={!!renaming} onClose={() => !busy && setRenaming(null)} icon={Pencil} title={renaming ? `Rename tag: ${renaming.from}` : 'Rename tag'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setRenaming(null)} disabled={busy}>Cancel</Button>
                        <Button onClick={submitRename} loading={busy} disabled={busy}>Rename</Button>
                    </>
                }>
                {renaming && (
                    <>
                        <FormField label="New tag" hint={`Under ${renaming.topic}. Use another tag's name to merge the two.`}>
                            <Input value={renaming.to} onChange={(e) => setRenaming((r) => ({ ...r, to: e.target.value }))} list="rename-tags" />
                        </FormField>
                        <datalist id="rename-tags">{tagsIn(live, renaming.subject, renaming.topic).map((t) => <option key={t} value={t} />)}</datalist>
                    </>
                )}
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
                    This publishes them to every user's formula cards immediately. The server re-checks
                    each card's completeness — anything failing stays in the queue. Every approval is logged.
                </p>
            </Modal>
        </div>
    );
}
