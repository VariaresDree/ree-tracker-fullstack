// src/features/board-simulator/SimulatorConfig.jsx
import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Card, Button, FormField, Select, SegmentedControl, Modal, StatusPill, cn } from '../../components/ui';
import { Settings2, Landmark, Scale, FileText, TriangleAlert } from '../../components/ui/icons';

const PROFILES = [
  {
    id: 'custom',
    icon: Settings2,
    name: 'Custom Drill',
    description: 'Pick the item count, topic, and source for focused practice.',
  },
  {
    id: 'prc_subject',
    icon: Landmark,
    name: 'PRC Standard',
    description: 'Strict 100 items with the fixed 4 or 6 hour board time limit.',
  },
  {
    id: 'prc_blended',
    icon: Scale,
    name: 'Full Blended',
    description: 'The full mock board: 100 mixed items in 5 hours.',
  },
];

export default function SimulatorConfig({ config, setConfig, session, startSimulation, engine }) {
  const { dynamicTOS } = useStore();
  const safeTOS = dynamicTOS || {};
  const isOnline = useNetworkStatus();
  const [showNewExamGuard, setShowNewExamGuard] = useState(false);

  const isCustom = config.mode === 'subject' && !config.isPrcStandard;
  const isPrcSubject = config.mode === 'subject' && config.isPrcStandard;
  const isBlended = config.mode === 'blended';
  const activeProfile = isBlended ? 'prc_blended' : isPrcSubject ? 'prc_subject' : 'custom';

  // State-safe profile handler
  const setProfile = (profile) => {
    if (profile === 'custom') {
      setConfig({
        ...config, mode: 'subject', isPrcStandard: false, count: 50,
        subject: config.subject === 'blended' ? 'Mathematics' : config.subject,
      });
    }
    if (profile === 'prc_subject') {
      setConfig({
        ...config, mode: 'subject', isPrcStandard: true, count: 100,
        subject: config.subject === 'blended' ? 'Mathematics' : config.subject,
      });
    }
    if (profile === 'prc_blended') {
      setConfig({ ...config, mode: 'blended', isPrcStandard: true, count: 100, subject: 'blended' });
    }
  };

  // Starting a new exam silently discards any saved one — make that a
  // deliberate choice instead of an accident.
  const handleStart = () => {
    if (engine?.hasSavedSession) {
      setShowNewExamGuard(true);
      return;
    }
    startSimulation();
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 page-fade-in pb-12 w-full">
      <Card elevated grain className="p-6 sm:p-10">
        <div className="mb-8 border-b border-border pb-5">
          <h2 className="text-display text-2xl sm:text-3xl text-textMain tracking-tight">Board Simulator</h2>
          <p className="text-sm text-muted2 mt-1">Choose how strict the exam should be.</p>
        </div>

        {session?.error && (
          <div className="mb-8 p-4 rounded-[var(--radius-default)] border-l-4 text-sm font-medium animate-in zoom-in"
            style={{
              borderColor: 'var(--accent-danger)',
              background: 'color-mix(in srgb, var(--accent-danger) 12%, transparent)',
              color: 'var(--text-main)',
            }}
          >
            {session.error}
          </div>
        )}

        {engine?.hasSavedSession && (
          <Card className="mb-8 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-4"
            style={{ borderColor: 'color-mix(in srgb, var(--color-reeAmber) 45%, transparent)' }}
          >
            <div className="flex flex-col gap-1.5">
              <StatusPill tone="amber">In progress</StatusPill>
              <p className="text-textMain font-semibold">Resume your last exam?</p>
              <p className="text-sm text-muted2">You have an unfinished simulation saved on this device.</p>
            </div>
            <Button tone="amber" onClick={engine.resumeSimulation} className="w-full sm:w-auto">
              Resume exam
            </Button>
          </Card>
        )}

        {/* Exam profile */}
        <div className="mb-8">
          <span className="text-eyebrow block mb-3">Exam profile</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="radiogroup" aria-label="Exam profile">
            {PROFILES.map((p) => {
              const selected = activeProfile === p.id;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setProfile(p.id)}
                  className={cn(
                    'p-5 rounded-[var(--radius-lg)] border text-left transition-all cursor-pointer flex flex-col gap-3 btn-press',
                    selected
                      ? 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)]'
                      : 'bg-surface2 border-border hover:bg-surface3 hover:border-border2'
                  )}
                >
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-default)]"
                    style={{
                      background: selected ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'var(--bg-surface3)',
                      color: selected ? 'var(--accent)' : 'var(--text-muted2)',
                    }}
                  >
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className={cn('text-sm font-semibold mb-1', selected ? 'text-[var(--accent)]' : 'text-textMain')}>{p.name}</h3>
                    <p className="text-xs text-muted2 leading-relaxed">{p.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject & topic */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-in fade-in slide-in-from-top-2">
          <FormField label="Subject" className="flex-1">
            <Select
              disabled={isBlended}
              value={config.subject}
              onChange={(e) => setConfig({ ...config, subject: e.target.value, subtopic: safeTOS[e.target.value]?.[0] || 'All' })}
            >
              {Object.keys(safeTOS).map((s) => (
                <option key={s} value={s}>{s === 'EE' ? 'Electrical Engineering (EE)' : s}</option>
              ))}
              {isBlended && <option value="blended">All subjects (blended)</option>}
            </Select>
          </FormField>

          {isCustom && config.subject && config.subject !== 'blended' && (
            <FormField label="Topic" className="flex-1 animate-in fade-in slide-in-from-left-4">
              <Select
                value={config.subtopic || 'All'}
                onChange={(e) => setConfig({ ...config, subtopic: e.target.value })}
              >
                <option value="All">All topics</option>
                {(safeTOS[config.subject] || []).map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
          )}
        </div>

        {/* Length, or the enforced board time limit */}
        {isCustom ? (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-3">
            <span className="text-eyebrow block mb-3">Length</span>
            <SegmentedControl
              label="Number of questions"
              value={config.count}
              onChange={(v) => setConfig({ ...config, count: v })}
              columns={2}
              className="sm:[grid-template-columns:repeat(4,minmax(0,1fr))]"
              options={[10, 20, 50, 100].map((n) => ({ value: n, label: `${n} questions` }))}
            />
          </div>
        ) : (
          <Card className="mb-8 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-3 bg-surface2">
            <div className="flex flex-col gap-1">
              <span className="text-eyebrow">Time limit</span>
              <span className="text-sm text-muted2">Fixed by PRC board rules.</span>
            </div>
            <span className="text-display text-3xl text-textMain font-mono tabular-nums bg-surface px-6 py-3 rounded-[var(--radius-default)] border border-border">
              {isBlended ? '05:00:00' : (config.subject === 'EE' ? '06:00:00' : '04:00:00')}
            </span>
          </Card>
        )}

        {/* Source (custom only) */}
        {isCustom && (
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4">
            <span className="text-eyebrow block mb-3">Source</span>
            <SegmentedControl
              label="Question source"
              value={config.source}
              onChange={(v) => setConfig({ ...config, source: v })}
              options={[
                { value: 'library', label: 'Question vault' },
                { value: 'ai', label: 'AI generated', hint: isOnline ? undefined : 'needs a connection', disabled: !isOnline },
              ]}
            />
          </div>
        )}

        {/* Primary action, with the PDF export visibly subordinate */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-6 border-t border-border">
          <Button
            size="lg"
            className="flex-1"
            loading={session?.loading && !engine?.isExporting}
            disabled={session?.loading}
            onClick={handleStart}
          >
            Start simulation
          </Button>
          <Button
            variant="ghost"
            loading={engine?.isExporting}
            disabled={session?.loading || engine?.isExporting}
            onClick={engine?.exportOfflinePDF}
          >
            <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
            Export exam paper (PDF)
          </Button>
        </div>
      </Card>

      <Modal
        open={showNewExamGuard}
        onClose={() => setShowNewExamGuard(false)}
        tone="amber"
        icon={TriangleAlert}
        title="Start a new exam?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => { setShowNewExamGuard(false); engine.resumeSimulation(); }}
            >
              Resume saved exam
            </Button>
            <Button
              tone="amber"
              onClick={() => { setShowNewExamGuard(false); startSimulation(); }}
            >
              Start new exam
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted2">
          Starting a new exam replaces the one saved on this device. Your answers in the saved exam will be lost.
        </p>
      </Modal>
    </div>
  );
}
