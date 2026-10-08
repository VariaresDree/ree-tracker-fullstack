// src/features/active-recall/ReviewSetup.jsx
//
// Practice's setup screen: due reviews, four one-tap presets, and a custom
// session behind a disclosure.
import { useState } from 'react';
import { Card, Button, FormField, Select, SegmentedControl, PageHeader, cn } from '../../components/ui';
import { Shuffle, Crosshair, Layers, Bookmark, ChevronDown, ChevronUp, RotateCcw } from '../../components/ui/icons';
import { useSrsSummary } from '../../hooks/useSrsSummary';
import { bookmarksPreset, drillPreset, dueReviewPreset, quickReviewPreset } from './presets';
import { customView, SCOPES } from './customView';

// A due session is capped so a backlog after a break doesn't become a
// 200-question wall; the rest stays in the queue for the next session.
const DUE_SESSION_MAX = 30;

const relativeDay = (iso) => {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'later today';
  return days === 1 ? 'tomorrow' : `in ${days} days`;
};

// One-tap presets cover the common sessions; the full configuration lives
// behind "Custom session" so first-time users aren't handed seven decisions.
// "Weak spots" is the one learner entry to the adaptive drill. It used to be
// offered three ways: this preset, a "Weak points" scope, and a "Smart drill"
// source that silently ignored the chosen subject.
const PRESETS = [
  {
    id: 'quick20',
    icon: Shuffle,
    name: 'Quick 20',
    meta: '20 mixed questions across all three subjects',
    needsConnection: false,
    overrides: quickReviewPreset(20),
  },
  {
    id: 'weak',
    icon: Crosshair,
    name: 'Weak spots',
    meta: 'An adaptive drill on your weakest topics',
    needsConnection: true,
    overrides: drillPreset({ count: 20 }),
  },
  {
    id: 'flash20',
    icon: Layers,
    name: 'Flashcards',
    meta: '20 cards for definitions and facts',
    needsConnection: false,
    overrides: { ...quickReviewPreset(20), sessionMode: 'flashcard' },
  },
  {
    id: 'bookmarks',
    icon: Bookmark,
    name: 'Bookmarks',
    meta: '20 of the questions you saved',
    needsConnection: true,
    overrides: bookmarksPreset(20),
  },
];

export default function ReviewSetup({ config, setConfig, session, safeTOS, isOnline, startSession }) {
  const [showCustom, setShowCustom] = useState(false);
  const [launchingPreset, setLaunchingPreset] = useState(null);

  const view = customView(config);

  const handleScopeChange = (mode) => {
    if (mode === 'interleaved') {
      setConfig({ ...view, studyMode: mode, subject: 'All', subtopic: 'All' });
      return;
    }
    const defaultSubj = 'Mathematics';
    // Only 'subtopic' scope pins a specific topic. 'By subject' MUST use
    // 'All' — pinning to the first topic made every by-subject session serve
    // only Algebra/Chemistry/Electromagnetism instead of the whole subject.
    const defaultSub = mode === 'subtopic' ? (safeTOS[defaultSubj]?.[0] || 'All') : 'All';
    setConfig({ ...view, studyMode: mode, subject: defaultSubj, subtopic: defaultSub });
  };

  const launchPreset = (preset) => {
    setLaunchingPreset(preset.id);
    startSession(preset.overrides);
  };

  const customDisabled = session.loading || (!isOnline && view.source !== 'library');
  const { summary: srs } = useSrsSummary({ enabled: isOnline });
  const dueCount = srs?.due || 0;
  const startDue = () => {
    setLaunchingPreset('srs-due');
    startSession(dueReviewPreset(Math.min(dueCount, DUE_SESSION_MAX)));
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 page-fade-in">
      <PageHeader title="Practice" subtitle="Pick a preset or build your own session." />

      {/* Spaced review — what the schedule says is due today. Shown only once
          there is a queue: every miss and every low-confidence answer starts a
          card, so it fills from ordinary practice. */}
      {srs && srs.total > 0 && (
        <Card elevated className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-default)]"
            style={{ background: 'color-mix(in srgb, var(--accent-success) 14%, transparent)', color: 'var(--accent-success)' }}
          >
            <RotateCcw size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-textMain font-semibold">
              {dueCount > 0 ? `${dueCount} question${dueCount === 1 ? '' : 's'} due for review` : 'Review queue is clear'}
            </p>
            <p className="text-xs text-muted2 mt-0.5">
              {dueCount > 0
                ? `Spaced review of what you missed or weren't sure of${srs.overdue > 0 ? ` · ${srs.overdue} overdue` : ''}.`
                : `Next review ${relativeDay(srs.nextDueAt) || 'once you practise more'}.`}
            </p>
          </div>
          {dueCount > 0 && (
            <Button loading={session.loading && launchingPreset === 'srs-due'} disabled={session.loading} onClick={startDue}>
              Review {Math.min(dueCount, DUE_SESSION_MAX)} now
            </Button>
          )}
        </Card>
      )}

      {/* One-click presets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-fade-in">
        {PRESETS.map((preset) => {
          const offline = preset.needsConnection && !isOnline;
          const Icon = preset.icon;
          return (
            <Card key={preset.id} elevated className="p-5 flex flex-col gap-3 hover-glow">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-default)]"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                  color: 'var(--accent-text)',
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
            <p className="text-xs text-muted2 mt-0.5">Choose the mode, focus, scope, length and source yourself.</p>
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
                value={view.sessionMode}
                onChange={(v) => setConfig({ ...view, sessionMode: v })}
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
                value={view.cognitiveFocus}
                onChange={(v) => setConfig({ ...view, cognitiveFocus: v })}
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
                value={view.studyMode}
                onChange={handleScopeChange}
                options={SCOPES}
              />
            </div>

            {['subject', 'subtopic'].includes(view.studyMode) && (
              <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-top-2">
                <FormField label="Subject" className="flex-1">
                  <Select
                    value={view.subject}
                    onChange={(e) => setConfig({
                      ...view,
                      subject: e.target.value,
                      // Keep 'All' unless the user is explicitly picking a topic.
                      subtopic: view.studyMode === 'subtopic' ? (safeTOS[e.target.value]?.[0] || 'All') : 'All',
                    })}
                  >
                    {Object.keys(safeTOS).map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </FormField>
                {view.studyMode === 'subtopic' && (
                  <FormField label="Topic" className="flex-1">
                    <Select
                      value={view.subtopic}
                      onChange={(e) => setConfig({ ...view, subtopic: e.target.value })}
                    >
                      {(safeTOS[view.subject] || []).map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </FormField>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-eyebrow">Length</span>
              <SegmentedControl
                label="Number of questions"
                value={view.count}
                onChange={(v) => setConfig({ ...view, count: v })}
                columns={2}
                className="sm:[grid-template-columns:repeat(4,minmax(0,1fr))]"
                options={[10, 20, 50, 100].map((n) => ({ value: n, label: `${n} questions` }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-eyebrow">Source</span>
              <SegmentedControl
                label="Question source"
                value={view.source}
                onChange={(v) => setConfig({ ...view, source: v })}
                columns={1}
                className="sm:[grid-template-columns:repeat(3,minmax(0,1fr))]"
                options={[
                  { value: 'library', label: 'Question bank' },
                  { value: 'bookmarks', label: 'My bookmarks', hint: isOnline ? undefined : 'needs a connection', disabled: !isOnline },
                  { value: 'ai', label: 'AI generated', hint: isOnline ? undefined : 'needs a connection', disabled: !isOnline },
                ]}
              />
            </div>

            {/* Sticky above the mobile bottom nav so the CTA never scrolls out
                of reach on a tall form. The offset comes from the layout, so a
                phone's home-indicator inset can't push it under the bar. */}
            <div className={cn('sticky bottom-[calc(var(--bottom-bar-h,3.6rem)+1.25rem)] md:static md:bottom-auto', 'bg-surface/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none -mx-2 px-2 py-2 md:m-0 md:p-0 rounded-[var(--radius-default)]')}>
              <Button
                size="lg"
                fullWidth
                loading={session.loading && !launchingPreset}
                disabled={customDisabled}
                onClick={() => { setLaunchingPreset(null); startSession(view); }}
              >
                Start session
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
