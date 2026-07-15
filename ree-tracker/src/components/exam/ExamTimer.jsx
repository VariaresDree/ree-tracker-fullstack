// src/components/exam/ExamTimer.jsx
// Shared exam clock with a show/hide (blur) toggle — the Board Simulator's
// timer, so the Gauntlet matches it. H:MM:SS for long board exams, MM:SS below
// an hour. Turns red + pulses in the final 5 minutes.
import { Button } from '../ui';
import { Eye, EyeOff } from '../ui/icons';
import { formatExamTime } from '../../utils/examFormat';

export default function ExamTimer({ timeRemaining, showTime = true, onToggleTime }) {
  const critical = timeRemaining < 300; // < 5 min

  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="ghost"
        onClick={onToggleTime}
        aria-label={showTime ? 'Hide time' : 'Show time'}
        className="text-muted hover:text-textMain"
      >
        {showTime ? <Eye size={16} strokeWidth={1.75} aria-hidden="true" /> : <EyeOff size={16} strokeWidth={1.75} aria-hidden="true" />}
      </Button>
      <div
        className={`text-lg sm:text-xl font-bold font-mono tabular-nums tracking-widest px-4 py-1 rounded-[var(--radius-default)] border transition-all duration-300 ${!showTime ? 'blur-sm opacity-20' : ''} ${critical ? 'animate-pulse' : 'bg-surface/50 text-textMain border-border2/60 shadow-inner'}`}
        style={critical ? {
          color: 'var(--accent-danger)',
          background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
          borderColor: 'color-mix(in srgb, var(--accent-danger) 30%, transparent)',
        } : undefined}
        aria-live="off"
      >
        {formatExamTime(timeRemaining)}
      </div>
    </div>
  );
}
