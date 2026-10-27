// src/features/active-recall/ReviewSetup.jsx
//
// Practice's setup screen, top to bottom: one hero (the due reviews when any
// are due, otherwise Quick 20), the other one-tap presets as cards, a custom
// session behind a disclosure, and where to turn when unsure (the mode guide
// and the placement test).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, CardTitle, CardWatermark, Button, Disclosure, FormField, Grid, IconChip, Select, SegmentedControl, Skeleton, Page, PageHeader, cn } from '../../components/ui';
import ModeGuide from '../exams/ModeGuide';
import { Shuffle, Crosshair, Gauge, Layers, Bookmark, RotateCcw } from '../../components/ui/icons';
import { useSrsSummary } from '../../hooks/useSrsSummary';
import { adaptivePreset, bookmarksPreset, drillPreset, dueReviewPreset, quickReviewPreset } from './presets';
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
    // Picked one at a time to match your level (POST /api/exams/next-item);
    // offline, the device picks from the offline pack (adaptiveFallback.js).
    id: 'adaptive',
    icon: Gauge,
    name: 'Adaptive set',
    meta: '20 questions picked one at a time to match your level',
    needsConnection: false,
    overrides: adaptivePreset({ count: 20 }),
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
    // Conceptual items only: a calculation as a flip card shows a bare number
    // on the back, with nothing to recall.
    overrides: { ...quickReviewPreset(20), sessionMode: 'flashcard', cognitiveFocus: 'conceptual' },
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
  const { summary: srs, loading: srsLoading } = useSrsSummary({ enabled: isOnline });
  const dueCount = srs?.due || 0;
  // The hero is the due reviews when any are due; otherwise Quick 20, which
  // then leaves the grid so no session is offered twice.
  const leadPreset = dueCount > 0 ? null : PRESETS[0];
  const gridPresets = leadPreset ? PRESETS.slice(1) : PRESETS;
  const startDue = () => {
    setLaunchingPreset('srs-due');
    startSession(dueReviewPreset(Math.min(dueCount, DUE_SESSION_MAX)));
  };

  return (
    <Page>
      <PageHeader title="Practice" subtitle="Pick a preset or build your own session." />
      {srsLoading ? (
        // Holds the hero's place while the queue loads, so the page doesn't
        // jump when it arrives.
        <Card variant="hero" aria-busy="true" aria-label="Checking your review queue" className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full max-w-prose" />
          <Skeleton className="h-11 w-full sm:w-40 mt-2" />
        </Card>
      ) : leadPreset ? (
        <Card as="section" variant="hero" aria-labelledby="practice-lead" className="flex flex-col gap-3">
          <CardWatermark icon={leadPreset.icon} />
          <p className="text-eyebrow">Start here</p>
          <h2 id="practice-lead" className="text-h2 text-textMain">{leadPreset.name}</h2>
          <p className="text-sm text-muted2 max-w-prose">{leadPreset.meta}.</p>
          {/* Spaced review: shown once there is a queue (every miss and every
              low-confidence answer starts a card), and nothing is due. */}
          {srs && srs.total > 0 && (
            <p className="text-xs text-muted2">
              <span>Review queue is clear</span> · Next review {relativeDay(srs.nextDueAt) || 'once you practise more'}.
            </p>
          )}
          <div className="pt-2">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              loading={session.loading && launchingPreset === leadPreset.id}
              disabled={session.loading}
              onClick={() => launchPreset(leadPreset)}
            >
              Start
            </Button>
          </div>
        </Card>
      ) : (
        // Spaced review: what the schedule says is due today.
        <Card as="section" variant="hero" aria-labelledby="practice-lead" className="flex flex-col gap-3">
          <CardWatermark icon={RotateCcw} />
          <p className="text-eyebrow">Due today</p>
          <h2 id="practice-lead" className="text-h2 text-textMain">
            {dueCount} question{dueCount === 1 ? '' : 's'} due for review
          </h2>
          <p className="text-sm text-muted2 max-w-prose">
            Spaced review of what you missed or weren't sure of{srs.overdue > 0 ? ` · ${srs.overdue} overdue` : ''}.
          </p>
          <div className="pt-2">
            <Button size="lg" className="w-full sm:w-auto" loading={session.loading && launchingPreset === 'srs-due'} disabled={session.loading} onClick={startDue}>
              Review {Math.min(dueCount, DUE_SESSION_MAX)} now
            </Button>
          </div>
        </Card>
      )}

      {/* One-tap presets. With all five, Quick 20 takes two columns of three,
          so the rows read 2+1 and 1+1+1; with four, two by two, then four
          across. */}
      <Grid kind={gridPresets.length === 4 ? 'kpi' : 'cards'} className="stagger-fade-in">
        {gridPresets.map((preset, i) => {
          const offline = preset.needsConnection && !isOnline;
          const Icon = preset.icon;
          return (
            <Card
              key={preset.id}
              variant="interactive"
              padding="md"
              className={cn('flex flex-col gap-3', gridPresets.length === 5 && i === 0 && '@4xl:col-span-2')}
            >
              <CardWatermark icon={Icon} corner="top" />
              <IconChip icon={Icon} />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {preset.name}
                  {offline && <Badge>Needs a connection</Badge>}
                </CardTitle>
                <p className="text-xs text-muted2">{preset.meta}</p>
              </div>
              <Button
                variant="secondary"
                fullWidth
                loading={session.loading && launchingPreset === preset.id}
                disabled={offline || session.loading}
                onClick={() => launchPreset(preset)}
              >
                Start
              </Button>
            </Card>
          );
        })}
      </Grid>

      {/* Custom session — progressive disclosure */}
      <Disclosure
        title="Custom session"
        description="Choose the mode, focus, scope, length and source yourself."
        open={showCustom}
        onToggle={setShowCustom}
        bodyClassName="flex flex-col gap-5"
      >
        <fieldset className="flex flex-col gap-5 min-w-0">
        <legend className="text-sm font-semibold text-textMain mb-3">What to practise</legend>
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
            label="Focus"
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

        </fieldset>

        <hr className="border-border" />

        <fieldset className="flex flex-col gap-5 min-w-0">
        <legend className="text-sm font-semibold text-textMain mb-3">How much</legend>
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
        </fieldset>

        {/* Sticky above the mobile bottom nav so the CTA never scrolls out
            of reach on a tall form. The offset comes from the layout, so a
            phone's home-indicator inset can't push it under the bar. */}
        <div className={cn('sticky bottom-[calc(var(--bottom-bar-h,3.6rem)+var(--fab-space,0px)+1.25rem)] md:static md:bottom-auto', 'bg-surface/95 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none -mx-2 px-2 py-2 md:m-0 md:p-0 rounded-[var(--radius-default)]')}>
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
      </Disclosure>

      {/* Where to turn when unsure: one quiet block under the sessions. */}
      <div className="flex flex-col gap-2">
        <ModeGuide folded here="practice" />
        <p className="text-sm text-muted2">
          Not sure where to start?{' '}
          <Link to="/diagnostic" className="text-[var(--accent-text)] underline underline-offset-2 inline-flex items-center pointer-coarse:min-h-11">Take the placement test</Link>
        </p>
      </div>
    </Page>
  );
}
