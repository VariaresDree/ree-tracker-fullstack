// src/features/active-recall/ReviewSetup.jsx
import { useState } from 'react';
import { Card, Button, FormField, Select, SegmentedControl, cn } from '../../components/ui';
import { Shuffle, Crosshair, Layers, ChevronDown, ChevronUp } from '../../components/ui/icons';

// One-click presets cover the common sessions; the full configuration lives
// behind the "Custom session" disclosure so first-time users aren't handed
// seven simultaneous decisions.
const PRESETS = [
  {
    id: 'quick20',
    icon: Shuffle,
    name: 'Quick 20 — mixed',
    meta: '20 questions across all subjects',
    needsConnection: false,
    overrides: {
      sessionMode: 'mcq', studyMode: 'interleaved', subject: 'All', subtopic: 'All',
      cognitiveFocus: 'mixed', count: 20, source: 'library',
    },
  },
  {
    id: 'weak50',
    icon: Crosshair,
    name: 'Weak points 50',
    meta: '50 questions targeting your weakest areas',
    needsConnection: true,
    overrides: {
      sessionMode: 'mcq', studyMode: 'bleeding',
      cognitiveFocus: 'mixed', count: 50, source: 'smart-drill',
    },
  },
  {
    id: 'flash20',
    icon: Layers,
    name: 'Flashcard sprint 20',
    meta: '20 flashcards for definitions and facts',
    needsConnection: false,
    overrides: {
      sessionMode: 'flashcard', studyMode: 'interleaved', subject: 'All', subtopic: 'All',
      cognitiveFocus: 'mixed', count: 20, source: 'library',
    },
  },
];

export default function ReviewSetup({ config, setConfig, session, safeTOS, isOnline, startSession }) {
  const [showCustom, setShowCustom] = useState(false);
  const [launchingPreset, setLaunchingPreset] = useState(null);

  const handleScopeChange = (mode) => {
    const defaultSubj = 'Mathematics';
    const defaultSub = safeTOS[defaultSubj]?.[0] || 'All';
    setConfig({ ...config, studyMode: mode, subject: defaultSubj, subtopic: defaultSub, source: 'library' });
  };

  const launchPreset = (preset) => {
    setLaunchingPreset(preset.id);
    startSession(preset.overrides);
  };

  const customDisabled = session.loading || (!isOnline && config.source !== 'library');

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 page-fade-in">
      <div>
        <h2 className="text-display text-2xl sm:text-3xl text-textMain tracking-tight">Active Review</h2>
        <p className="text-sm text-muted2 mt-1">Pick a preset or build a custom session.</p>
      </div>

      {/* One-click presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-fade-in">
        {PRESETS.map((preset) => {
          const offline = preset.needsConnection && !isOnline;
          const Icon = preset.icon;
          return (
            <Card key={preset.id} elevated className="p-5 flex flex-col gap-3 hover-glow">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-default)]"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                  color: 'var(--accent)',
                }}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="text-textMain font-semibold">{preset.name}</p>
                <p className="text-xs text-muted2 mt-0.5">{preset.meta}</p>
              </div>
              <Button
                fullWidth
                loading={session.loading && launchingPreset === preset.id}
                disabled={offline || session.loading}
                onClick={() => launchPreset(preset)}
              >
                Start
              </Button>
              {offline && <p className="text-xs text-muted text-center">Needs a connection</p>}
            </Card>
          );
        })}
      </div>

      {/* Custom session — progressive disclosure */}
      <Card elevated>
        <button
          type="button"
          onClick={() => setShowCustom((v) => !v)}
          aria-expanded={showCustom}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer hover:bg-surface2 rounded-[var(--radius-lg)] transition-colors"
        >
          <div>
            <p className="text-textMain font-semibold">Custom session</p>
            <p className="text-xs text-muted2 mt-0.5">Choose the mode, focus, scope, length, and source yourself.</p>
          </div>
          {showCustom
            ? <ChevronUp size={18} strokeWidth={1.75} aria-hidden="true" className="text-muted shrink-0" />
            : <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" className="text-muted shrink-0" />}
        </button>

        {showCustom && (
          <div className="px-5 pb-5 flex flex-col gap-5 animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-eyebrow">Mode</span>
              <SegmentedControl
                label="Session mode"
                value={config.sessionMode}
                onChange={(v) => setConfig({ ...config, sessionMode: v })}
                options={[
                  { value: 'mcq', label: 'Multiple choice' },
                  { value: 'flashcard', label: 'Flashcards', hint: 'best for definitions and facts' },
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-eyebrow">Focus</span>
              <SegmentedControl
                label="Cognitive focus"
                value={config.cognitiveFocus}
                onChange={(v) => setConfig({ ...config, cognitiveFocus: v })}
                options={[
                  { value: 'mixed', label: 'Mixed' },
                  { value: 'conceptual', label: 'Theory' },
                  { value: 'calculation', label: 'Calculation' },
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-eyebrow">Scope</span>
              <SegmentedControl
                label="Study scope"
                value={config.studyMode}
                onChange={handleScopeChange}
                columns={2}
                className="sm:[grid-template-columns:repeat(4,minmax(0,1fr))]"
                options={[
                  { value: 'interleaved', label: 'Interleaved' },
                  { value: 'subject', label: 'By subject' },
                  { value: 'subtopic', label: 'By subtopic' },
                  { value: 'bleeding', label: 'Weak points' },
                ]}
              />
            </div>

            {['subject', 'subtopic'].includes(config.studyMode) && (
              <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-top-2">
                <FormField label="Subject" className="flex-1">
                  <Select
                    value={config.subject}
                    onChange={(e) => setConfig({ ...config, subject: e.target.value, subtopic: safeTOS[e.target.value]?.[0] || 'All' })}
                  >
                    {Object.keys(safeTOS).map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </FormField>
                {config.studyMode === 'subtopic' && (
                  <FormField label="Topic" className="flex-1">
                    <Select
                      value={config.subtopic}
                      onChange={(e) => setConfig({ ...config, subtopic: e.target.value })}
                    >
                      {(safeTOS[config.subject] || []).map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </FormField>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-eyebrow">Length</span>
              <SegmentedControl
                label="Number of questions"
                value={config.count}
                onChange={(v) => setConfig({ ...config, count: v })}
                columns={2}
                className="sm:[grid-template-columns:repeat(4,minmax(0,1fr))]"
                options={[10, 20, 50, 100].map((n) => ({ value: n, label: `${n} questions` }))}
              />
            </div>

            {config.studyMode !== 'bleeding' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-eyebrow">Source</span>
                <SegmentedControl
                  label="Question source"
                  value={config.source}
                  onChange={(v) => setConfig({ ...config, source: v })}
                  columns={1}
                  className="sm:[grid-template-columns:repeat(3,minmax(0,1fr))]"
                  options={[
                    { value: 'library', label: 'Library' },
                    { value: 'smart-drill', label: 'Smart drill', hint: isOnline ? 'targets weak areas' : 'needs a connection', disabled: !isOnline },
                    { value: 'ai', label: 'AI generated', hint: isOnline ? undefined : 'needs a connection', disabled: !isOnline },
                  ]}
                />
              </div>
            )}

            {/* Sticky above the mobile bottom nav so the CTA never scrolls out
                of reach on a tall form. */}
            <div className={cn('sticky bottom-20 md:static md:bottom-auto', 'bg-surface/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none -mx-2 px-2 py-2 md:m-0 md:p-0 rounded-[var(--radius-default)]')}>
              <Button
                size="lg"
                fullWidth
                loading={session.loading && !launchingPreset}
                disabled={customDisabled}
                onClick={() => { setLaunchingPreset(null); startSession(); }}
              >
                Start review session
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
