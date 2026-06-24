import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { generateStudyPlan, clearStudyPlan } from '../../services/dbQueries';
import { TOS_WEIGHTS } from '../../utils/tosWeights';
import toast from 'react-hot-toast';

const SUBJECT_MAP = { Mathematics: 'MATHEMATICS', ESAS: 'ESAS', EE: 'EE' };

export default function StudyPlanGenerator({ onPlanGenerated }) {
    const { dynamicTOS, stats, saveExamConfig } = useStore();
    const safeTOS = dynamicTOS || {};

    const examDate = stats?.examDate || '';
    const [customExamDate, setCustomExamDate] = useState(examDate);
    const [selectedSubjects, setSelectedSubjects] = useState(['Mathematics', 'ESAS', 'EE']);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    // Keep the planner's date mirrored to the canonical exam date — so a change
    // made in Command Parameters or the Identity Matrix shows here too.
    useEffect(() => {
        if (stats?.examDate) setCustomExamDate(stats.examDate);
    }, [stats?.examDate]);

    const daysUntilExam = useMemo(() => {
        if (!customExamDate) return null;
        const diff = new Date(customExamDate) - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }, [customExamDate]);

    const topicsToGenerate = useMemo(() => {
        const topics = [];
        selectedSubjects.forEach(subject => {
            const subtopics = safeTOS[subject] || [];
            const weight = TOS_WEIGHTS[SUBJECT_MAP[subject]] || 0.33;
            subtopics.forEach(subtopic => {
                topics.push({ subject, subtopic, weight });
            });
        });

        // Sort by PRC weight (EE topics first since EE is 45%)
        return topics.sort((a, b) => b.weight - a.weight);
    }, [selectedSubjects, safeTOS]);

    const handleGenerate = async () => {
        if (!customExamDate) return toast.error('Set your exam date first');
        if (topicsToGenerate.length === 0) return toast.error('No topics selected');
        if (daysUntilExam <= 0) return toast.error('Exam date must be in the future');

        setIsGenerating(true);
        try {
            // Generating a plan for a date commits that date as the canonical
            // exam date — persist it so the whole app stays in sync (no more
            // ephemeral-only planner date).
            if (customExamDate !== stats?.examDate) {
                await saveExamConfig({ examDate: customExamDate }).catch(() => {});
            }
            const result = await generateStudyPlan(customExamDate, topicsToGenerate);
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
                    <h3 className="text-lg font-black text-textMain tracking-tight">Study Plan Generator</h3>
                    <p className="text-xs text-muted mt-1">Auto-generate a day-by-day plan weighted by PRC TOS</p>
                </div>
                <button
                    onClick={handleClear}
                    disabled={isClearing}
                    className="text-xs text-reeRed hover:underline cursor-pointer disabled:opacity-50"
                >
                    {isClearing ? 'Clearing...' : 'Clear Plan'}
                </button>
            </div>

            {/* Exam Date */}
            <div className="mb-5">
                <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-muted mb-2">
                    Board Exam Date
                </label>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={customExamDate}
                        onChange={(e) => setCustomExamDate(e.target.value)}
                        className="bg-bg border border-border2 text-textMain p-3 rounded-xl text-sm outline-none focus:border-reeBlue transition-colors flex-1 cursor-pointer"
                    />
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
                <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-muted mb-2">
                    Subjects to Include
                </label>
                <div className="flex gap-2 flex-wrap">
                    {Object.keys(safeTOS).map(subject => {
                        const weight = TOS_WEIGHTS[SUBJECT_MAP[subject]];
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
                                <span className="ml-1 text-[0.55rem] opacity-60">{subtopicCount} topics</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Summary */}
            <div className="bg-bg border border-border2 rounded-xl p-4 mb-5">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-[0.6rem] font-bold uppercase tracking-widest text-muted mb-1">Topics</div>
                        <div className="text-xl font-black text-textMain">{topicsToGenerate.length}</div>
                    </div>
                    <div>
                        <div className="text-[0.6rem] font-bold uppercase tracking-widest text-muted mb-1">Days</div>
                        <div className="text-xl font-black text-textMain">{daysUntilExam || '—'}</div>
                    </div>
                    <div>
                        <div className="text-[0.6rem] font-bold uppercase tracking-widest text-muted mb-1">Tasks</div>
                        <div className="text-xl font-black text-reeBlue">
                            {daysUntilExam ? Math.min(daysUntilExam, topicsToGenerate.length * 2) : '—'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={isGenerating || !customExamDate || daysUntilExam <= 0 || topicsToGenerate.length === 0}
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
