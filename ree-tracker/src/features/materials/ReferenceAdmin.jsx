// src/features/materials/ReferenceAdmin.jsx
// Admin console for the modular reference library: insert/delete engineering
// constants & formulas, verify coverage ("what's included vs. still needed"),
// and promote the bundled seed into editable DB rows in one click.
import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import LatexRenderer from '../../components/LatexRenderer';
import { useReferenceData } from '../../hooks/useReferenceData';
import {
    createConstant, deleteConstant,
    createFormula, deleteFormula,
    importReferenceLibrary,
} from '../../services/dbQueries';

// Curated "should be covered" reference targets — drives the verification view.
const REQUIRED_CONSTANT_CATEGORIES = ['Physical Constants', 'Equipment Standards', 'PEC Wiring (THHN)', 'Regulatory', 'Conversions'];
// Canonical PRC TOS names (Phase 3.3) — formula subtopic tags are
// canonicalized in useReferenceData, so coverage matches these labels.
const REQUIRED_FORMULA_COVERAGE = {
    Mathematics: ['Algebra', 'Trigonometry', 'Analytic Geometry', 'Differential Calculus', 'Integral Calculus', 'Other Engineering Mathematics', 'Probability and Statistics'],
    ESAS: ['Engineering Economics and Management', 'College Physics', 'Fluid Mechanics', 'Thermodynamics'],
    EE: ['DC Electric Circuits', 'AC Electric Circuits', 'Power System Interconnection', 'DC Generators', 'AC Generators'],
};
const SUBJECTS = ['Mathematics', 'ESAS', 'EE'];

const CoverageChip = ({ label, ok, count }) => (
    <span className={`text-[0.6rem] px-2 py-1 rounded border font-bold tracking-wide flex items-center gap-1 ${ok ? 'bg-reeGreen/10 border-reeGreen/30 text-reeGreen' : 'bg-reeRed/10 border-reeRed/30 text-reeRed'}`}>
        {ok ? '✓' : '✗'} {label}{typeof count === 'number' ? ` (${count})` : ''}
    </span>
);

export default function ReferenceAdmin() {
    const { mergedConstants, mergedFormulas, dbConstants, dbFormulas, bundledConstants, bundledFormulas, reload, loading } = useReferenceData();
    const [panel, setPanel] = useState('constants');
    const [busy, setBusy] = useState(false);

    // --- forms ---
    const [cForm, setCForm] = useState({ category: '', name: '', value: '', keyword: '', subject: '' });
    const [fForm, setFForm] = useState({ subject: 'EE', title: '', eq: '', subtopics: '' });

    // --- coverage ---
    const constCoverage = useMemo(() => REQUIRED_CONSTANT_CATEGORIES.map((cat) => {
        const count = mergedConstants.filter((c) => c.category === cat).length;
        return { label: cat, ok: count > 0, count };
    }), [mergedConstants]);

    const formulaCoverage = useMemo(() => SUBJECTS.map((subj) => ({
        subject: subj,
        items: (REQUIRED_FORMULA_COVERAGE[subj] || []).map((sub) => {
            const count = mergedFormulas.filter((f) => f.subject === subj && (f.subtopics || []).includes(sub)).length;
            return { label: sub, ok: count > 0, count };
        }),
    })), [mergedFormulas]);

    const handleAddConstant = async (e) => {
        e.preventDefault();
        if (!cForm.category || !cForm.name || !cForm.value) return toast.error('Category, name and value are required.');
        setBusy(true);
        try {
            await createConstant({
                category: cForm.category.trim(),
                name: cForm.name.trim(),
                value: cForm.value.trim(),
                keyword: cForm.keyword.trim() || null,
                subject: cForm.subject.trim() || null,
            });
            toast.success('Constant added.');
            setCForm({ category: '', name: '', value: '', keyword: '', subject: '' });
            await reload();
        } catch (err) { toast.error(err.message || 'Failed to add constant.'); }
        finally { setBusy(false); }
    };

    const handleAddFormula = async (e) => {
        e.preventDefault();
        if (!fForm.subject || !fForm.title || !fForm.eq) return toast.error('Subject, title and equation are required.');
        setBusy(true);
        try {
            await createFormula({
                subject: fForm.subject,
                title: fForm.title.trim(),
                eq: fForm.eq.trim(),
                subtopics: fForm.subtopics.split(',').map((s) => s.trim()).filter(Boolean),
            });
            toast.success('Formula added.');
            setFForm({ subject: fForm.subject, title: '', eq: '', subtopics: '' });
            await reload();
        } catch (err) { toast.error(err.message || 'Failed to add formula.'); }
        finally { setBusy(false); }
    };

    const handleDelete = async (kind, id) => {
        if (!window.confirm('Delete this reference entry?')) return;
        setBusy(true);
        try {
            if (kind === 'constant') await deleteConstant(id);
            else await deleteFormula(id);
            toast.success('Deleted.');
            await reload();
        } catch (err) { toast.error(err.message || 'Delete failed.'); }
        finally { setBusy(false); }
    };

    const handleImportBundled = async () => {
        if (!window.confirm('Import the bundled seed into the database as editable rows? Existing duplicates are skipped.')) return;
        setBusy(true);
        const toastId = toast.loading('Importing bundled library…');
        try {
            const res = await importReferenceLibrary({
                constants: bundledConstants.map(({ category, name, value, keyword, subject }) => ({ category, name, value, keyword: keyword || null, subject: subject || null })),
                formulas: bundledFormulas.map(({ subject, title, eq, subtopics }) => ({ subject, title, eq, subtopics: subtopics || [] })),
            });
            toast.success(`Imported ${res.constantsAdded} constants, ${res.formulasAdded} formulas.`, { id: toastId });
            await reload();
        } catch (err) { toast.error(err.message || 'Import failed.', { id: toastId }); }
        finally { setBusy(false); }
    };

    const inputCls = 'w-full bg-bg border border-border2 text-textMain p-2.5 rounded-lg text-sm outline-none focus:border-reePurple transition-colors';

    return (
        <div className="flex flex-col gap-6 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                    {['constants', 'formulas'].map((p) => (
                        <button key={p} onClick={() => setPanel(p)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${panel === p ? 'bg-reePurple/10 text-reePurple border border-reePurple/30' : 'text-muted hover:text-textMain border border-transparent'}`}>
                            {p === 'constants' ? '📐 Constants' : '🧮 Formulas'}
                        </button>
                    ))}
                </div>
                <button onClick={handleImportBundled} disabled={busy}
                    className="px-4 py-2 rounded-lg text-[0.65rem] font-bold uppercase tracking-wider border border-reeCyan/40 text-reeCyan hover:bg-reeCyan/10 transition-all cursor-pointer disabled:opacity-50">
                    ⬇ Import bundled into DB
                </button>
            </div>

            {/* Coverage / verification */}
            <div className="p-4 bg-surface2/40 border border-border2 rounded-xl">
                <div className="text-[0.65rem] font-black text-muted uppercase tracking-widest mb-3">Coverage — what's included vs. needed</div>
                {panel === 'constants' ? (
                    <div className="flex flex-wrap gap-2">
                        {constCoverage.map((c) => <CoverageChip key={c.label} {...c} />)}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {formulaCoverage.map((grp) => (
                            <div key={grp.subject} className="flex flex-wrap items-center gap-2">
                                <span className="text-[0.6rem] font-black text-textMain uppercase tracking-widest w-24 shrink-0">{grp.subject}</span>
                                {grp.items.map((it) => <CoverageChip key={it.label} {...it} />)}
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-3 text-[0.6rem] text-muted2">
                    {panel === 'constants'
                        ? `${mergedConstants.length} total (${dbConstants.length} in DB · ${bundledConstants.length} bundled seed)`
                        : `${mergedFormulas.length} total (${dbFormulas.length} in DB · ${bundledFormulas.length} bundled seed)`}
                </div>
            </div>

            {/* Add form */}
            {panel === 'constants' ? (
                <form onSubmit={handleAddConstant} className="p-4 bg-surface border border-border2 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input className={inputCls} placeholder="Category (e.g. Physical Constants)" value={cForm.category} onChange={(e) => setCForm({ ...cForm, category: e.target.value })} />
                    <input className={inputCls} placeholder="Name (LaTeX ok, e.g. Speed of Light ($c$))" value={cForm.name} onChange={(e) => setCForm({ ...cForm, name: e.target.value })} />
                    <input className={inputCls} placeholder="Value (LaTeX ok, e.g. $2.998\\times10^8$ m/s)" value={cForm.value} onChange={(e) => setCForm({ ...cForm, value: e.target.value })} />
                    <input className={inputCls} placeholder="Keyword (optional, for tooltips)" value={cForm.keyword} onChange={(e) => setCForm({ ...cForm, keyword: e.target.value })} />
                    <button type="submit" disabled={busy} className="sm:col-span-2 py-2.5 bg-reePurple hover:brightness-110 text-white font-bold rounded-lg text-xs uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50">➕ Add Constant</button>
                </form>
            ) : (
                <form onSubmit={handleAddFormula} className="p-4 bg-surface border border-border2 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select className={inputCls} value={fForm.subject} onChange={(e) => setFForm({ ...fForm, subject: e.target.value })}>
                        {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input className={inputCls} placeholder="Title (e.g. Ohm's Law (Impedance))" value={fForm.title} onChange={(e) => setFForm({ ...fForm, title: e.target.value })} />
                    <input className={`${inputCls} sm:col-span-2`} placeholder="Equation LaTeX (e.g. $$V = I \\times Z$$)" value={fForm.eq} onChange={(e) => setFForm({ ...fForm, eq: e.target.value })} />
                    <input className={`${inputCls} sm:col-span-2`} placeholder="Subtopics, comma-separated (e.g. DC Electric Circuits, General)" value={fForm.subtopics} onChange={(e) => setFForm({ ...fForm, subtopics: e.target.value })} />
                    <button type="submit" disabled={busy} className="sm:col-span-2 py-2.5 bg-reePurple hover:brightness-110 text-white font-bold rounded-lg text-xs uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50">➕ Add Formula</button>
                </form>
            )}

            {/* DB rows list (deletable). Bundled seed is read-only baseline. */}
            <div className="flex flex-col gap-2">
                <div className="text-[0.65rem] font-black text-muted uppercase tracking-widest">
                    Database entries {loading ? '· loading…' : `(${panel === 'constants' ? dbConstants.length : dbFormulas.length})`}
                </div>
                {(panel === 'constants' ? dbConstants : dbFormulas).length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-border2 rounded-xl text-muted2 text-xs font-mono">
                        No DB entries yet — the bundled seed still shows in the matrix. Add above, or import the bundled library.
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {(panel === 'constants' ? dbConstants : dbFormulas).map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 p-3 bg-surface border border-border2 rounded-lg">
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-textMain truncate">
                                        <LatexRenderer content={panel === 'constants' ? item.name : item.title} />
                                    </div>
                                    <div className="text-[0.65rem] text-muted2 truncate">
                                        {panel === 'constants' ? `${item.category} · ` : `${item.subject} · `}
                                        <LatexRenderer content={panel === 'constants' ? item.value : item.eq} />
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(panel === 'constants' ? 'constant' : 'formula', item.id)} disabled={busy}
                                    className="shrink-0 p-2 text-muted hover:text-reeRed hover:bg-reeRed/10 rounded-md transition-colors cursor-pointer text-xs" title="Delete">
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
