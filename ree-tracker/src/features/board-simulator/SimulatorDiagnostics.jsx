// src/features/board-simulator/SimulatorDiagnostics.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LatexRenderer from '../../components/LatexRenderer';
import { Button, Modal } from '../../components/ui';
import { Shield, Zap, Clock, TriangleAlert } from '../../components/ui/icons';

export default function SimulatorDiagnostics({ session, setSession, engine, isBattle = false }) {
    const { diagnostics } = session;
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const navigate = useNavigate();

    if (!diagnostics) return null;

    const isPassed = diagnostics.score >= 70;
    const isConditional = diagnostics.score >= 60 && diagnostics.score < 70;
    const accent = isPassed ? 'var(--accent-success)' : isConditional ? 'var(--color-reeAmber)' : 'var(--accent-danger)';

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}m ${s.toString().padStart(2, '0')}s`;
    };

    const handleExit = () => {
        const reset = (s) => ({ ...s, isActive: false, isFinished: false, diagnostics: null, questions: [] });
        if (engine && typeof engine.setSession === 'function') engine.setSession(reset);
        else if (typeof setSession === 'function') setSession(reset);
        // SPA navigation home (there is no '/dashboard' route — the old
        // window.location.href hard-reloaded and dropped in-memory state).
        navigate('/');
    };

    const scrollbarClasses = '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-surface2/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted/60 [&::-webkit-scrollbar-thumb]:rounded-full';

    return (
        <>
            <Modal
                open={showExitConfirm}
                onClose={() => setShowExitConfirm(false)}
                title="Leave results?"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowExitConfirm(false)}>Stay</Button>
                        <Button onClick={handleExit}>Back to dashboard</Button>
                    </>
                }
            >
                <p className="text-sm text-muted2">
                    Your report is saved to the simulation ledger — you can revisit it from the dashboard.
                </p>
            </Modal>

            {/* 🚀 MAIN CONTENT */}
            <div className={`flex flex-col gap-8 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12 z-0 relative transition-all duration-500 origin-center ${showExitConfirm ? 'scale-95 blur-md opacity-40 pointer-events-none' : 'scale-100 blur-none opacity-100'}`}>

                {/* Score hero */}
                <div
                    className="relative p-10 sm:p-16 bg-surface/80 backdrop-blur-2xl border rounded-[var(--radius-xl)] flex flex-col items-center justify-center text-center overflow-hidden transition-all duration-1000"
                    style={{ borderColor: `color-mix(in srgb, ${accent} 20%, transparent)` }}
                >
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 blur-[100px] rounded-full pointer-events-none"
                        style={{ background: `color-mix(in srgb, ${accent} 10%, transparent)` }}
                    ></div>

                    <div className="relative z-10">
                        <h2 className="text-eyebrow mb-4">Results</h2>
                        <div className="text-display text-8xl sm:text-9xl tracking-tighter drop-shadow-lg mb-2" style={{ color: accent }}>
                            {diagnostics.score}%
                        </div>
                        <div
                            className="text-xl sm:text-2xl font-bold uppercase tracking-widest bg-bg/50 px-6 py-2 rounded-[var(--radius-default)] inline-block backdrop-blur-md border border-border2/50"
                            style={{ color: accent }}
                        >
                            {diagnostics.verdict}
                        </div>

                        <div className="flex justify-center gap-4 sm:gap-8 mt-10 flex-wrap">
                            <div className="bg-surface2 border border-border2/50 px-8 py-5 rounded-[var(--radius-lg)] flex flex-col items-center min-w-[140px] shadow-sm">
                                <span className="text-eyebrow mb-1">Correct</span>
                                <span className="text-2xl font-bold text-textMain tabular-nums">{diagnostics.correctItems} <span className="text-muted text-lg">/ {diagnostics.totalItems}</span></span>
                            </div>
                            <div className="bg-surface2 border border-border2/50 px-8 py-5 rounded-[var(--radius-lg)] flex flex-col items-center min-w-[140px] shadow-sm">
                                <span className="text-eyebrow mb-1">Time used</span>
                                <span className="text-2xl font-bold text-textMain tabular-nums">{formatTime(diagnostics.timeTakenSecs)}</span>
                            </div>
                        </div>

                        {isBattle && (
                            <div className="mt-8 max-w-lg mx-auto text-xs text-muted2 bg-bg/50 border border-border2/50 rounded-[var(--radius-default)] px-5 py-3 flex items-center gap-2 justify-center">
                                <Clock size={14} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-reeAmber)' }} />
                                Your result is recorded. Dashboard analytics can take a minute to catch up after a multiplayer exam.
                            </div>
                        )}
                    </div>
                </div>

                {/* Per-subject breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {[
                        { label: 'Mathematics', score: diagnostics.subjectScores?.Math, accent: 'var(--accent-velocity)' },
                        { label: 'ESAS', score: diagnostics.subjectScores?.ESAS, accent: 'var(--color-reeAmber)' },
                        { label: 'EE Professional', score: diagnostics.subjectScores?.EE, accent: 'var(--accent-signal)' },
                    ].map((subj, i) => (
                        <div key={i} className="bg-surface/80 backdrop-blur-md border border-border2/60 p-6 rounded-[var(--radius-lg)] shadow-sm transition-transform hover:-translate-y-1">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-eyebrow">{subj.label}</span>
                                <span className="text-xl font-bold text-textMain tabular-nums">{subj.score !== null && subj.score !== undefined ? `${subj.score}%` : 'N/A'}</span>
                            </div>
                            <div className="w-full h-2.5 bg-surface3/50 rounded-full overflow-hidden border border-border2/30 shadow-inner">
                                <div className="h-full transition-all duration-1500 ease-out rounded-full" style={{ width: `${subj.score || 0}%`, background: subj.accent }}></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Weak topics + slow items */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    <div className="bg-surface/80 backdrop-blur-md border border-border2/60 p-6 sm:p-8 rounded-[var(--radius-lg)] shadow-sm flex flex-col">
                        <h3 className="text-sm font-semibold text-textMain flex items-center gap-2 mb-6">
                            <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--accent-danger)' }} /> Weak topics
                        </h3>
                        <div className={`flex flex-col gap-3 flex-1 max-h-[400px] overflow-y-auto pr-3 ${scrollbarClasses}`}>
                            {diagnostics.weakTopics?.length > 0 ? diagnostics.weakTopics.map((topic, i) => (
                                <div
                                    key={i}
                                    className="px-5 py-4 rounded-[var(--radius-default)] text-sm font-semibold shadow-inner border"
                                    style={{
                                        background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
                                        borderColor: 'color-mix(in srgb, var(--accent-danger) 20%, transparent)',
                                        color: 'color-mix(in srgb, var(--accent-danger) 85%, var(--text-main))',
                                    }}
                                >
                                    {topic}
                                </div>
                            )) : (
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border2/50 rounded-[var(--radius-lg)] opacity-70 p-6 text-center gap-2">
                                    <Shield size={22} strokeWidth={1.75} aria-hidden="true" className="text-muted" />
                                    <span className="text-xs text-muted2">No weak topics this run — every topic scored 60% or better.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-surface/80 backdrop-blur-md border border-border2/60 p-6 sm:p-8 rounded-[var(--radius-lg)] shadow-sm flex flex-col">
                        <h3 className="text-sm font-semibold text-textMain flex items-center gap-2 mb-2">
                            <Clock size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-reeAmber)' }} /> Slow items
                            <span
                                className="px-2 py-0.5 rounded-[var(--radius-sm)] border text-xs tabular-nums"
                                style={{
                                    color: 'var(--color-reeAmber)',
                                    background: 'color-mix(in srgb, var(--color-reeAmber) 10%, transparent)',
                                    borderColor: 'color-mix(in srgb, var(--color-reeAmber) 20%, transparent)',
                                }}
                            >{diagnostics.chronoAnomalies?.length || 0}</span>
                        </h3>
                        <p className="text-xs text-muted2 mb-6">Questions that took more than 3 minutes.</p>

                        <div className={`flex flex-col gap-4 flex-1 max-h-[400px] overflow-y-auto pr-3 ${scrollbarClasses}`}>
                            {diagnostics.chronoAnomalies?.length > 0 ? diagnostics.chronoAnomalies.map((q, i) => (
                                <div key={i} className="p-6 bg-surface2 border border-border2/60 rounded-[var(--radius-lg)] text-base text-textMain/90 font-medium [&_p]:!m-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-sm">
                                    <LatexRenderer content={q.text || q.question} />
                                </div>
                            )) : (
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border2/50 rounded-[var(--radius-lg)] opacity-70 p-6 text-center gap-2">
                                    <Zap size={22} strokeWidth={1.75} aria-hidden="true" className="text-muted" />
                                    <span className="text-xs text-muted2">Good pacing — nothing took over 3 minutes.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Blind spots — high-confidence answers that were wrong */}
                <div
                    className="bg-surface/80 backdrop-blur-md border p-6 sm:p-10 rounded-[var(--radius-xl)] flex flex-col mt-4 relative overflow-hidden"
                    style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 40%, transparent)' }}
                >
                    <h3 className="text-sm font-semibold text-textMain flex items-center gap-2 mb-2 relative z-10">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-danger)' }}></span> Blind spots
                        <span
                            className="px-2 py-0.5 rounded-[var(--radius-sm)] border text-xs tabular-nums"
                            style={{
                                color: 'var(--accent-danger)',
                                background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
                                borderColor: 'color-mix(in srgb, var(--accent-danger) 20%, transparent)',
                            }}
                        >{diagnostics.blindSpots?.length || 0}</span>
                    </h3>
                    <p className="text-xs text-muted2 mb-8 relative z-10">Answers you marked high-confidence that turned out wrong — review these first.</p>

                    <div className={`flex flex-col gap-6 relative z-10 max-h-[800px] overflow-y-auto pr-3 ${scrollbarClasses}`}>
                        {diagnostics.blindSpots?.length > 0 ? diagnostics.blindSpots.map((q, i) => (
                            <div key={i} className="p-6 sm:p-8 bg-surface2 border border-border2/60 rounded-[var(--radius-lg)] flex flex-col gap-6 shadow-sm">

                                <div className="text-base sm:text-xl font-medium text-textMain [&_p]:!m-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    <LatexRenderer content={q.text || q.question} />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-5 pt-6 border-t border-border2/50">
                                    <div
                                        className="flex-1 border p-6 rounded-[var(--radius-lg)] relative overflow-hidden shadow-inner"
                                        style={{
                                            background: 'color-mix(in srgb, var(--accent-danger) 12%, var(--bg-surface))',
                                            borderColor: 'color-mix(in srgb, var(--accent-danger) 40%, transparent)',
                                        }}
                                    >
                                        <span className="block text-eyebrow mb-3 relative z-10" style={{ color: 'var(--accent-danger)' }}>Your answer</span>
                                        <div
                                            className="text-base sm:text-lg [&_p]:!m-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] line-through font-medium relative z-10"
                                            style={{
                                                color: 'color-mix(in srgb, var(--accent-danger) 70%, var(--text-main))',
                                                textDecorationColor: 'color-mix(in srgb, var(--accent-danger) 50%, transparent)',
                                            }}
                                        >
                                            <LatexRenderer content={q.userAnswer || 'No answer selected'} />
                                        </div>
                                    </div>
                                    <div
                                        className="flex-1 border p-6 rounded-[var(--radius-lg)] relative overflow-hidden"
                                        style={{
                                            background: 'color-mix(in srgb, var(--accent-success) 12%, var(--bg-surface))',
                                            borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)',
                                        }}
                                    >
                                        <span className="block text-eyebrow mb-3 relative z-10" style={{ color: 'var(--accent-success)' }}>Correct answer</span>
                                        <div
                                            className="text-base sm:text-lg font-bold [&_p]:!m-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative z-10"
                                            style={{ color: 'color-mix(in srgb, var(--accent-success) 70%, var(--text-main))' }}
                                        >
                                            <LatexRenderer content={q.answer} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div
                                className="py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-[var(--radius-lg)] shadow-inner gap-3"
                                style={{
                                    borderColor: 'color-mix(in srgb, var(--accent-success) 30%, transparent)',
                                    background: 'color-mix(in srgb, var(--accent-success) 5%, transparent)',
                                }}
                            >
                                <Shield size={36} strokeWidth={1.5} aria-hidden="true" style={{ color: 'var(--accent-success)' }} />
                                <span className="text-sm font-semibold" style={{ color: 'var(--accent-success)' }}>No blind spots</span>
                                <span className="text-xs text-muted2">Your confidence matched your results on every question.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Exit */}
                <div className="flex justify-center mt-10 relative z-10">
                    <Button size="lg" onClick={() => setShowExitConfirm(true)}>
                        Back to dashboard
                    </Button>
                </div>

            </div>
        </>
    );
}
