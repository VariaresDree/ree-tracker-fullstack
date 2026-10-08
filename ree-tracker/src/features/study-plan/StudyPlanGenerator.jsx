import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { generateStudyPlan, clearStudyPlan } from '../../services/dbQueries';
import { TOS_WEIGHTS } from '../../utils/tosWeights';
import { normalizeSubject } from '@ree/shared';
import { useShallow } from 'zustand/react/shallow';
import toast from 'react-hot-toast';

// SUBJECT_MAP is gone: it existed only to bridge tosWeights' UPPERCASE keys to
// the canonical subject names used everywhere else. TOS_WEIGHTS is now keyed
// canonically (from @ree/shared), so the subject name indexes it directly.

export default function StudyPlanGenerator({ onPlanGenerated }) {
    const { dynamicTOS, stats } = useStore(
        useShallow((s) => ({ dynamicTOS: s.dynamicTOS, stats: s.stats })),
    );
    const safeTOS = dynamicTOS || {};

    // The exam date is set in one place, Account → Exam plan; the planner reads
    // it (it used to keep its own editable copy, a third editor for one field).
    const examDate = stats?.examDate || '';
    const [selectedSubjects, setSelectedSubjects] = useState(['Mathematics', 'ESAS', 'EE']);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const daysUntilExam = useMemo(() => {
        if (!examDate) return null;
        const diff = new Date(examDate) - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }, [examDate]);

    const topicsToGenerate = useMemo(() => {
        const topics = [];
        selectedSubjects.forEach(subject => {
            const subtopics = safeTOS[subject] || [];
            const weight = TOS_WEIGHTS[normalizeSubject(subject)] || 0.33;
            subtopics.forEach(subtopic => {
                topics.push({ subject, subtopic, weight });
            });
        });

        // Sort by PRC weight (EE topics first since EE is 45%)
        return topics.sort((a, b) => b.weight - a.weight);
    }, [selectedSubjects, safeTOS]);

    const handleGenerate = async () => {
        if (!examDate) return toast.error('Set your exam date in Account first');
        if (topicsToGenerate.length === 0) return toast.error('No topics selected');
        if (daysUntilExam <= 0) return toast.error('Exam date must be in the future');

        setIsGenerating(true);
        try {
            const result = await generateStudyPlan(examDate, topicsToGenerate);
            toast.success(`Generated ${result.tasksCreated} study tasks`);
            onPlanGenerated?.();
        } catch (error) {
            toast.error(error.message || 'Failed to generate plan');
        }
        setIsGenerating(false);
    };

    const handleClear = async () => {
        setIsClearing(true);
        try {
            const result = await clearStudyPlan();
            toast.success(`Cleared ${result.deleted} plan tasks`);
            onPlanGenerated?.();
        } catch (error) {
            toast.error('Failed to clear plan');
        }
        setIsClearing(false);
    };

    const toggleSubject = (subject) => {
        setSelectedSubjects(prev =>
            prev.includes(subject)
                ? prev.filter(s => s !== subject)
                : [...prev, subject]
        );
    };

    return (
        <div className="bg-surface border border-border2 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-lg font-black text-textMain tracking-tight">Study plan generator</h2>
                    <p className="text-xs text-muted mt-1">
                        Plans the next six weeks from your mastery and the PRC weights: a targeted drill most days, a timed
                        sitting each week, light review before the exam. Tasks tick themselves off from your answers.
                    </p>
                </div>
                <button
                    onClick={handleClear}
                    disabled={isClearing}
                    className="text-xs text-reeRed hover:underline cursor-pointer disabled:opacity-50"
                >
                    {isClearing ? 'Clearing...' : 'Clear Plan'}
                </button>
            </div>

            {/* Exam date — read here, edited in Account */}
            <div className="mb-5">
                <p className="text-eyebrow mb-2">Board exam date</p>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-textMain tabular-nums">{examDate || 'Not set'}</span>
                    <Link to="/account#exam-plan" className="text-sm text-[var(--accent-text)] hover:underline touch-target inline-flex items-center">
                        {examDate ? 'Change' : 'Set your exam date'}
                    </Link>
                    {daysUntilExam !== null && (
                        <div className={`text-sm font-bold px-3 py-2 rounded-lg border ${
                            daysUntilExam <= 30 ? 'bg-reeRed/10 text-reeRed border-reeRed/30' :
                            daysUntilExam <= 90 ? 'bg-reeAmber/10 text-reeAmber border-reeAmber/30' :
                            'bg-reeGreen/10 text-reeGreen border-reeGreen/30'
                        }`}>
                            {daysUntilExam} days
                        </div>
                    )}
                </div>
            </div>

            {/* Subject Selection */}
            <div className="mb-5">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-2">
                    Subjects to Include
                </label>
                <div className="flex gap-2 flex-wrap">
                    {Object.keys(safeTOS).map(subject => {
                        const weight = TOS_WEIGHTS[normalizeSubject(subject)];
                        const isSelected = selectedSubjects.includes(subject);
                        const subtopicCount = (safeTOS[subject] || []).length;
                        return (
                            <button
                                key={subject}
                                onClick={() => toggleSubject(subject)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                                    isSelected
                                        ? 'bg-reeBlue/10 text-reeBlue border-reeBlue/30'
                                        : 'bg-surface2 text-muted border-border2 hover:border-reeBlue/20'
                                }`}
                            >
                                {subject} ({Math.round((weight || 0) * 100)}%)
                                <span className="ml-1 text-[11px] opacity-60">{subtopicCount} topics</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Summary */}
            <div className="bg-bg border border-border2 rounded-xl p-4 mb-5">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-muted mb-1">Topics</div>
                        <div className="text-xl font-black text-textMain">{topicsToGenerate.length}</div>
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-muted mb-1">Days</div>
                        <div className="text-xl font-black text-textMain">{daysUntilExam || '—'}</div>
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-muted mb-1">Tasks</div>
                        <div className="text-xl font-black text-reeBlue">
                            {daysUntilExam ? Math.min(daysUntilExam, 42) : '—'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={isGenerating || !examDate || daysUntilExam <= 0 || topicsToGenerate.length === 0}
                className="w-full py-3.5 bg-reeBlue hover:bg-reeBlue2 text-white font-black rounded-xl text-sm uppercase tracking-wider transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
                {isGenerating ? (
                    <><span className="telemetry-spinner !w-4 !h-4 !border-white"></span> Generating Plan...</>
                ) : (
                    <><span>🗓️</span> Generate Study Plan</>
                )}
            </button>
        </div>
    );
}
