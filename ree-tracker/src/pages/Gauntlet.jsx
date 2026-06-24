// src/pages/Gauntlet.jsx
//
// Distraction-free timed gauntlet. Adopts the shared QuestionCard for prompt
// + confidence + choices + reveal, keeps its own chrome (level header, clock,
// right-flank navigator grid, submit/abort actions). Confidence is now
// captured on every item (silent MED default if skipped) so gauntlet attempts
// feed the same calibration analytics as Active Review and Simulator.

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGauntletEngine } from '../features/gauntlet/useGauntletEngine';
import GauntletDiagnostics from '../features/gauntlet/GauntletDiagnostics';
import QuestionCard from '../features/quiz/QuestionCard';

export default function Gauntlet() {
  const { level } = useParams();
  const navigate = useNavigate();
  const {
    status, questions, answers, confidences, timeLeft, diagnostics,
    handleAnswer, handleConfidence, submitExam,
  } = useGauntletEngine(level);

  const [currentIndex, setCurrentIndex] = useState(0);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4 page-fade-in">
        <span className="telemetry-spinner !w-12 !h-12 border-reePurple border-t-transparent"></span>
        <span className="text-sm font-bold text-reePurple uppercase tracking-widest animate-pulse">Constructing Matrix Simulation...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4 page-fade-in text-center">
        <span className="text-5xl">⚠️</span>
        <span className="text-sm font-bold text-reeRed uppercase tracking-widest">Simulation Failed to Compile</span>
        <button onClick={() => navigate('/arena')} className="px-6 py-2 bg-surface2 border border-border2 rounded-lg text-xs font-bold text-textMain">Return to Arena Hub</button>
      </div>
    );
  }

  if (status === 'diagnostics') {
    return <GauntletDiagnostics diagnostics={diagnostics} level={level} questions={questions} answers={answers} formatTime={formatTime} navigate={navigate} />;
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="w-full flex flex-col page-fade-in bg-bg min-h-screen">
      {/* Distraction-free warning bar */}
      <div className="w-full bg-reeRed/10 border-b border-reeRed/30 px-4 py-2.5 text-center relative z-20">
        <span className="text-[0.65rem] font-black text-reeRed uppercase tracking-[0.2em] animate-pulse">
          ⚠️ DISTRACTION-FREE BOARD SIMULATION ACTIVE — REAL-TIME PENALTIES APPLY
        </span>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6 w-full px-4 pt-6 pb-16 flex-1 items-stretch">
        {/* Left flank: level header + question card + nav buttons */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-surface border border-border2 p-4 rounded-xl flex justify-between items-center shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-reePurple text-white rounded-md text-[0.65rem] font-black uppercase tracking-widest">
                LEVEL {level}
              </span>
              <span className="text-xs font-bold text-textMain font-mono">
                Item {currentIndex + 1} of {questions.length}
              </span>
            </div>
            <div className={`px-4 py-1 rounded-lg border font-mono font-black text-base shadow-inner ${timeLeft < 300 ? 'bg-reeRed/20 text-reeRed border-reeRed animate-pulse' : 'bg-bg text-textMain border-border2'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Question canvas — shared QuestionCard. Confidence is shown (silent
              MED default if skipped under time pressure) so gauntlet attempts
              feed the calibration analytics. */}
          <div className="bg-surface border border-border2 rounded-2xl p-6 md:p-8 min-h-[420px] flex flex-col relative shadow-md">
            <QuestionCard
              question={currentQ}
              selectedOption={answers[currentIndex] ?? null}
              confidence={confidences?.[currentIndex] ?? null}
              state="answering"
              showConfidence={true}
              requireConfidence={false}
              hotkeys={true}
              index={currentIndex}
              onSelect={(opt) => handleAnswer(currentIndex, opt)}
              onConfidenceChange={(level) => handleConfidence?.(currentIndex, level)}
            />
          </div>

          {/* Linear controls */}
          <div className="flex justify-between items-center mt-2">
            <button onClick={() => setCurrentIndex((c) => Math.max(0, c - 1))} disabled={currentIndex === 0} className="px-5 py-3 bg-surface2 border border-border2 hover:bg-surface3 text-textMain rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
              Previous Item
            </button>
            <button onClick={() => setCurrentIndex((c) => Math.min(questions.length - 1, c + 1))} disabled={currentIndex === questions.length - 1} className="px-6 py-3 bg-surface border border-border2 hover:bg-surface2 text-textMain rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
              Next Item ⏭
            </button>
          </div>
        </div>

        {/* Right flank: navigator grid + submit/abort */}
        <div className="w-full md:w-72 bg-surface border border-border2 rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[300px] md:min-h-auto">
          <div className="w-full">
            <div className="border-b border-border2 pb-3 mb-4">
              <h4 className="text-xs font-black text-textMain uppercase tracking-widest">
                Performance Index
              </h4>
              <p className="text-[0.65rem] text-muted mt-0.5 font-mono">
                Level {level} Telemetry Grid
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2 overflow-y-auto max-h-[400px] custom-scrollbar pr-1">
              {questions.map((_, idx) => {
                const isAnswered = answers[idx] !== undefined;
                const isCurrent = currentIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to item ${idx + 1}`}
                    className={`aspect-square rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                      isCurrent ? 'ring-2 ring-reePurple ring-offset-2 ring-offset-bg bg-reePurple/20 text-reePurple border-reePurple' :
                      isAnswered ? 'bg-surface3 border-muted text-textMain' : 'bg-bg border-border2 text-muted hover:border-muted'
                    } border flex items-center justify-center`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border2 flex flex-col gap-2">
            <button
              onClick={() => { if (window.confirm('Submit Level-Up Exam for final evaluation?')) submitExam(); }}
              className="w-full py-4 bg-reePurple hover:bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-colors cursor-pointer text-center"
            >
              Lock & Submit Exam
            </button>
            <button
              onClick={() => { if (window.confirm('Abort exam sequence? This will record zero progress parameters.')) navigate('/arena'); }}
              className="w-full py-2.5 bg-surface2 hover:bg-reeRed/10 border border-border2 hover:border-reeRed/30 text-muted hover:text-reeRed rounded-lg text-[0.65rem] font-bold uppercase tracking-widest transition-colors cursor-pointer text-center"
            >
              Abort Protocol
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
