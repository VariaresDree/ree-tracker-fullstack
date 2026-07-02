import React, { useState, useEffect } from 'react';
import { fetchPendingExplanations, updateExplanationStatus } from '../../services/dbQueries';
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
                <button onClick={loadPending} className="text-xs text-reeBlue hover:underline cursor-pointer shrink-0">
                    Refresh
                </button>
            </div>

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
