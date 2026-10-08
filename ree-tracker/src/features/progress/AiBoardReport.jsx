// src/features/progress/AiBoardReport.jsx
//
// "AI board report": a written readiness review built from the learner's
// topic stats, weak topics and readiness index. Moved from the old Dashboard
// header to Progress → Overview, beside the numbers it summarizes. It costs
// one AI request, so it asks first.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { WEAK_TOPIC_ACCURACY } from '@ree/shared';
import { generateBoardReadinessReport } from '../../services/geminiApi';
import { fetchReadinessScore } from '../../services/dbQueries';
import { Button, Modal } from '../../components/ui';
import { Sparkles } from '../../components/ui/icons';

export default function AiBoardReport({ stats }) {
  const [confirming, setConfirming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState('');

  const generate = async () => {
    setConfirming(false);
    setGenerating(true);
    const weakTopics = Object.entries(stats?.microTopics || {})
      .filter(([, t]) => t.attempts > 0 && t.correct / t.attempts < WEAK_TOPIC_ACCURACY)
      .map(([name]) => name);
    try {
      const readiness = await fetchReadinessScore().catch(() => null);
      setReport(await generateBoardReadinessReport(stats, readiness?.score ?? null, weakTopics));
    } catch {
      toast.error('Could not generate the report right now. Please try again later.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setConfirming(true)} loading={generating}>
        {!generating && <Sparkles size={15} strokeWidth={2} aria-hidden="true" />}
        {generating ? 'Writing your report…' : 'AI board report'}
      </Button>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Generate an AI board report?"
        icon={Sparkles}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button size="sm" onClick={generate}>Generate report</Button>
          </>
        }
      >
        <p className="text-sm text-muted2 leading-relaxed">
          Writes a readiness review from your topic results, blind spots and trend. It uses one AI request.
        </p>
      </Modal>

      <Modal
        open={!!report}
        onClose={() => setReport('')}
        title="AI board report"
        icon={Sparkles}
        size="lg"
        footer={<Button size="sm" onClick={() => setReport('')}>Close</Button>}
      >
        <div className="text-sm text-textMain leading-relaxed whitespace-pre-wrap">{report}</div>
      </Modal>
    </>
  );
}
