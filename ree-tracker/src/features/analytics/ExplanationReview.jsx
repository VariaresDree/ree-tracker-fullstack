import React, { useState, useEffect } from 'react';
import { fetchPendingExplanations, updateExplanationStatus, bulkApproveExplanations } from '../../services/dbQueries';
import { Button, Modal } from '../../components/ui';
import { CheckCircle2 } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
    const colors = {
        PENDING: 'bg-reeAmber/20 text-reeAmber border-reeAmber/30',
        APPROVED: 'bg-reeGreen/20 text-reeGreen border-reeGreen/30',
        REJECTED: 'bg-reeRed/20 text-reeRed border-reeRed/30'
    };
    return (
        <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${colors[status] || colors.PENDING}`}>
            {status}
        </span>
    );
};

export default function ExplanationReview() {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [processing, setProcessing] = useState(null);
    // "Accept All" batch approval (confirmation-gated, server-reconciled).
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);
    const [isBulkApproving, setIsBulkApproving] = useState(false);

    useEffect(() => {
        loadPending();
    }, []);

    const loadPending = async () => {
        setLoading(true);
        try {
            const data = await fetchPendingExplanations();
            setQuestions(data.items || []);
        } catch (error) {
            toast.error('Failed to load pending explanations');
        }
        setLoading(false);
    };

    // ONE batched request; the SERVER response is the source of truth — only
    // ids it actually approved leave the list, failures stay visible + toast.
    const handleBulkApprove = async () => {
        const ids = questions.map((q) => q.id);
        if (ids.length === 0) { setShowBulkConfirm(false); return; }
        setIsBulkApproving(true);
        try {
            const res = await bulkApproveExplanations(ids);
            const approvedSet = new Set(res?.approved || []);
            setQuestions((prev) => prev.filter((q) => !approvedSet.has(q.id)));
            const failedCount = (res?.failed || []).length;
            if (approvedSet.size > 0) toast.success(`${approvedSet.size} explanation${approvedSet.size === 1 ? '' : 's'} approved.`);
            if (failedCount > 0) toast.error(`${failedCount} item${failedCount === 1 ? '' : 's'} failed and stay in the queue.`);
        } catch {
            toast.error('Bulk approval failed — nothing was changed.');
        } finally {
            setIsBulkApproving(false);
            setShowBulkConfirm(false);
        }
    };

    const handleAction = async (questionId, status) => {
        setProcessing(questionId);
        try {
            await updateExplanationStatus(questionId, status);
            setQuestions(prev => prev.filter(q => q.id !== questionId));
            toast.success(`Explanation ${status.toLowerCase()}`);
        } catch (error) {
            toast.error(`Failed to ${status.toLowerCase()} explanation`);
        }
        setProcessing(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="telemetry-spinner !w-6 !h-6" />
                <span className="ml-3 text-muted text-sm">Loading review queue...</span>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-muted text-sm font-medium">No pending explanations to review</p>
                <button onClick={loadPending} className="mt-4 text-xs text-reeBlue hover:underline cursor-pointer">
                    Refresh
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-start justify-between mb-2 gap-3">
                <div>
                    <h3 className="text-sm font-bold text-textMain">
                        Explanation Review Queue ({questions.length})
                    </h3>
                    <p className="text-[0.7rem] text-muted2 mt-1 leading-relaxed max-w-2xl">
                        Approve or reject AI-generated explanations queued for the question bank.
                        Approved text becomes the canonical solution shown when you review that item;
                        rejected explanations are discarded so the question can be re-derived later.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <Button size="sm" tone="success" onClick={() => setShowBulkConfirm(true)} disabled={isBulkApproving}>
                        Accept all {questions.length} shown
                    </Button>
                    <button onClick={loadPending} className="text-xs text-reeBlue hover:underline cursor-pointer">
                        Refresh
                    </button>
                </div>
            </div>

            {/* Accept-All confirmation — the queue pages 50 at a time, so the
                count is exactly what's shown, not the whole backlog. */}
            <Modal
                open={showBulkConfirm}
                onClose={() => !isBulkApproving && setShowBulkConfirm(false)}
                tone="amber"
                icon={CheckCircle2}
                title={`Approve all ${questions.length} shown explanation${questions.length === 1 ? '' : 's'}?`}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowBulkConfirm(false)} disabled={isBulkApproving}>Cancel</Button>
                        <Button tone="success" onClick={handleBulkApprove} loading={isBulkApproving} disabled={isBulkApproving || questions.length === 0}>
                            Approve {questions.length}
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-muted2">
                    Each approved explanation becomes the canonical solution users see for that
                    question. The queue shows up to 50 at a time — refresh afterwards to load any
                    remaining backlog. Every approval is logged.
                </p>
            </Modal>

            {questions.map(q => (
                <div key={q.id} className="bg-surface border border-border2 rounded-xl overflow-hidden">
                    <div
                        className="p-4 cursor-pointer hover:bg-surface2 transition-colors"
                        onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted">
                                        {q.subject}
                                    </span>
                                    <span className="text-[11px] text-muted">•</span>
                                    <span className="text-[11px] text-muted">{q.subtopic}</span>
                                </div>
                                <div className="text-xs text-textMain font-medium line-clamp-2 [&_p]:!mb-0">
                                    <LatexRenderer content={q.text} />
                                </div>
                            </div>
                            <StatusBadge status={q.explanationStatus} />
                        </div>
                    </div>

                    {expandedId === q.id && (
                        <div className="border-t border-border2 p-4">
                            <div className="bg-bg rounded-lg p-3 mb-3 border border-border2">
                                <div className="text-[11px] font-bold uppercase tracking-widest text-muted mb-2">
                                    Question
                                </div>
                                <div className="text-xs text-textMain leading-relaxed">
                                    <LatexRenderer content={q.text} />
                                </div>
                            </div>
                            <div className="bg-surface2 rounded-lg p-3 mb-4">
                                <div className="text-[11px] font-bold uppercase tracking-widest text-muted mb-2">
                                    AI-Generated Explanation
                                </div>
                                <div className="text-xs text-textMain leading-relaxed">
                                    <LatexRenderer content={q.fixedExplanation} />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAction(q.id, 'APPROVED')}
                                    disabled={processing === q.id}
                                    className="flex-1 px-3 py-2 bg-reeGreen/10 hover:bg-reeGreen/20 text-reeGreen border border-reeGreen/30 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {processing === q.id ? 'Processing...' : '✓ Approve'}
                                </button>
                                <button
                                    onClick={() => handleAction(q.id, 'REJECTED')}
                                    disabled={processing === q.id}
                                    className="flex-1 px-3 py-2 bg-reeRed/10 hover:bg-reeRed/20 text-reeRed border border-reeRed/30 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    ✗ Reject
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
