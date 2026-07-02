// src/components/RecommendedModule.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Panel } from './ui';
import { Target, ArrowRight } from './ui/icons';

export default function RecommendedModule({ stats }) {
  const navigate = useNavigate();

  // Find the subtopic with the most mistakes (min 3 attempts to qualify).
  const weakestLink = useMemo(() => {
    if (!stats?.microTopics) return null;
    let topic = null;
    let score = -1;
    Object.entries(stats.microTopics).forEach(([name, data]) => {
      if (data.attempts >= 3) {
        const mistakes = data.attempts - data.correct;
        if (mistakes > score) {
          score = mistakes;
          topic = name;
        }
      }
    });
    return { topic, score };
  }, [stats]);

  if (!weakestLink?.topic) {
    return (
      <Panel icon={Target} eyebrow="Focus" title="Critical focus" className="h-full">
        <p className="text-sm text-muted2 leading-relaxed">
          Answer at least 3 items per topic in any session to unlock targeting.
        </p>
      </Panel>
    );
  }

  return (
    <Card
      elevated
      className="relative overflow-hidden flex flex-col"
      style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 32%, transparent)' }}
    >
      <span className="absolute top-0 left-0 w-1 h-full" style={{ background: 'var(--accent-danger)' }} />
      <div className="p-5 flex flex-col gap-4">
        <div>
          <div
            className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.18em]"
            style={{ color: 'var(--accent-danger)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-danger)' }} />
            Critical focus
          </div>
          <h3 className="text-lg font-semibold text-textMain leading-tight mt-1.5 line-clamp-2" title={weakestLink.topic}>
            {weakestLink.topic}
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex flex-col">
            <span className="text-[11px] text-muted uppercase tracking-wider">Risk level</span>
            <span className="font-semibold" style={{ color: 'var(--accent-danger)' }}>
              High · {weakestLink.score} error{weakestLink.score === 1 ? '' : 's'}
            </span>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex flex-col">
            <span className="text-[11px] text-muted uppercase tracking-wider">Recommended</span>
            <span className="font-semibold text-textMain">Active recall</span>
          </div>
        </div>

        <Button variant="danger" onClick={() => navigate('/review')} className="w-full">
          Launch focused review <ArrowRight size={15} strokeWidth={2} />
        </Button>
      </div>
    </Card>
  );
}
