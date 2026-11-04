// src/features/active-recall/ReviewSetup.jsx
//
// Practice's setup screen, top to bottom: one hero (the due reviews when any
// are due, otherwise Quick 20), the other presets as small tiles that start on a
// tap, "Build your own" as a second hero that opens its setup in a sheet, and where
// to turn when unsure (the mode guide and the placement test).
//
// A sheet rather than a page: it's a few quick choices that come straight back
// here. It's kept in ?build=1, so Back closes it, and its footer holds Start, so
// nothing has to float over the choices.
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardWatermark, Button, FormField, Grid, IconChip, Modal, Select, SegmentedControl, Skeleton, Page, PageHeader, cn } from '../../components/ui';
import ModeGuide from '../exams/ModeGuide';
import { Shuffle, Crosshair, Gauge, Layers, Bookmark, RotateCcw, ChevronRight, Settings2 } from '../../components/ui/icons';
import { SYLLABUS_SUBJECTS, toDisplaySubject } from '@ree/shared';
import { useSrsSummary } from '../../hooks/useSrsSummary';
import { adaptivePreset, bookmarksPreset, drillPreset, dueReviewPreset, quickReviewPreset } from './presets';
import { BUILDER_COUNTS, builderSummary, chooseScope, customView, liveScope, readRememberedBuilder, rememberBuilder } from './customView';

// A due session is capped so a backlog after a break doesn't become a
// 200-question wall; the rest stays in the queue for the next session.
const DUE_SESSION_MAX = 30;

const relativeDay = (iso) => {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'later today';
  return days === 1 ? 'tomorrow' : `in ${days} days`;
};

// One-tap presets cover the common sessions. "Weak spots" is the one learner
// entry to the adaptive drill. It used to be offered three ways: this preset, a
// "Weak points" scope, and a "Smart drill" source that silently ignored the
// chosen subject.
const PRESETS = [
  {
    id: 'quick20',
    icon: Shuffle,
    name: 'Quick 20',
    meta: '20 mixed questions across all three subjects',
    short: 'Mixed, all subjects',
    overrides: quickReviewPreset(20),
  },
  {
    // Picked one at a time to match your level (POST /api/exams/next-item);
    // offline, the device picks from the offline pack (adaptiveFallback.js).
    id: 'adaptive',
    icon: Gauge,
    name: 'Adaptive set',
    meta: '20 questions picked one at a time to match your level',
    short: 'Matched to your level',
    overrides: adaptivePreset({ count: 20 }),
  },
  {
    id: 'weak',
    icon: Crosshair,
    name: 'Weak spots',
    meta: 'An adaptive drill on your weakest topics',
    short: 'Your weakest topics',
    overrides: drillPreset({ count: 20 }),
  },
  {
    id: 'flash20',
    icon: Layers,
    name: 'Flashcards',
    meta: '20 cards for definitions and facts',
    short: 'Definitions and facts',
    // Conceptual items only: a calculation as a flip card shows a bare number
    // on the back, with nothing to recall.
    overrides: { ...quickReviewPreset(20), sessionMode: 'flashcard', cognitiveFocus: 'conceptual' },
  },
  {
    id: 'bookmarks',
    icon: Bookmark,
    name: 'Bookmarks',
    meta: '20 of the questions you saved',
    short: 'Questions you saved',
    overrides: bookmarksPreset(20),
  },
];

const SUBJECT_OPTIONS = [
  { value: 'All', label: 'All' },
  ...SYLLABUS_SUBJECTS.map((s) => ({ value: s, label: toDisplaySubject(s) })),
];

// A small field: its label above its choices.
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-label">{label}</span>
      {children}
    </div>
  );
}

export default function ReviewSetup({ config, session, safeTOS, isOnline, startSession, saved, onResume, onDiscard }) {
  const [launchingPreset, setLaunchingPreset] = useState(null);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const building = params.get('build') === '1';
  const withoutBuild = (prev) => {
    const next = new URLSearchParams(prev);
    next.delete('build');
    return next;
  };
  const openBuilder = () => setParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set('build', '1');
    return next;
  }, { state: { builderSheet: true } });
  // Opening added a history entry, so closing goes back over it. One opened from a
  // link has nothing behind it to go back to.
  const closeBuilder = () => {
    if (location.state?.builderSheet) navigate(-1);
    else setParams(withoutBuild, { replace: true });
  };
  // The builder keeps its own state, so a preset run in between doesn't overwrite
  // the session you built. Remembered on this device as you change it.
  const [built, setBuilt] = useState(() => readRememberedBuilder() || customView(config));
  const view = liveScope(built, safeTOS);
  const build = (next) => {
    setBuilt(next);
    rememberBuilder(next);
  };

  const launchPreset = (preset) => {
    setLaunchingPreset(preset.id);
    startSession(preset.overrides);
  };

  const customDisabled = session.loading || (!isOnline && view.source === 'ai');
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
      <PageHeader title="Practice" />

      {saved && (
        <Card padding="sm" className="flex flex-wrap items-center gap-3" role="region" aria-label="Unfinished session" style={{ borderColor: 'color-mix(in srgb, var(--color-reeAmber) 45%, transparent)' }}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-textMain">Continue your session</p>
            <p className="text-xs text-muted2 tabular-nums">{saved.totalAnswered || 0} of {saved.target || saved.questions.length} answered</p>
          </div>
          <Button size="sm" onClick={onResume}>Continue</Button>
          <Button size="sm" variant="ghost" onClick={onDiscard}>Discard</Button>
        </Card>
      )}
      {srsLoading ? (
        // Holds the hero's place while the queue loads, so the page doesn't
        // jump when it arrives.
        <Card variant="hero" padding="md" aria-busy="true" aria-label="Checking your review queue" className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full max-w-prose" />
          <Skeleton className="h-11 w-full sm:w-40 mt-2" />
        </Card>
      ) : leadPreset ? (
        <Card as="section" variant="hero" padding="md" aria-labelledby="practice-lead" className="flex flex-col gap-2">
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
          <div className="pt-1">
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
        <Card as="section" variant="hero" padding="md" aria-labelledby="practice-lead" className="flex flex-col gap-2">
          <CardWatermark icon={RotateCcw} />
          <p className="text-eyebrow">Due today</p>
          <h2 id="practice-lead" className="text-h2 text-textMain">
            {dueCount} question{dueCount === 1 ? '' : 's'} due for review
          </h2>
          <p className="text-sm text-muted2 max-w-prose">
            Spaced review of what you missed or weren't sure of{srs.overdue > 0 ? ` · ${srs.overdue} overdue` : ''}.
          </p>
          <div className="pt-1">
            <Button size="lg" className="w-full sm:w-auto" loading={session.loading && launchingPreset === 'srs-due'} disabled={session.loading} onClick={startDue}>
              Review {Math.min(dueCount, DUE_SESSION_MAX)} now
            </Button>
          </div>
        </Card>
      )}

      {/* The whole tile starts the session. With all five, Quick 20 takes a row of
          its own on a phone and two of three columns on a wide screen, so no gap
          is left; with four, two by two, then four across. */}
      <Grid kind={gridPresets.length === 4 ? 'kpi' : 'tiles'} gap="sm" className="stagger-fade-in">
        {gridPresets.map((preset, i) => {
          const starting = session.loading && launchingPreset === preset.id;
          const Icon = preset.icon;
          return (
            <Card
              key={preset.id}
              as="button"
              type="button"
              variant="interactive"
              padding="sm"
              aria-label={`Start ${preset.name}`}
              aria-busy={starting || undefined}
              disabled={session.loading}
              onClick={() => launchPreset(preset)}
              className={cn(
                'flex items-center gap-3 min-w-0 text-left cursor-pointer disabled:cursor-default disabled:opacity-60',
                gridPresets.length === 5 && i === 0 && 'col-span-2',
              )}
            >
              <IconChip icon={Icon} size="sm" />
              <span className="min-w-0 flex flex-col">
                <span className="text-sm font-semibold text-textMain">{preset.name}</span>
                <span className="text-xs text-muted2">{starting ? 'Starting…' : preset.short}</span>
              </span>
            </Card>
          );
        })}
      </Grid>

      {/* The whole card is the button (the ::after), and only its title names it, so
          a screen reader hears the title and then the setup it will open on. */}
      <Card as="section" variant="hero" padding="md" aria-labelledby="practice-build" className="flex items-center gap-4">
        <CardWatermark icon={Settings2} />
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <h2 id="practice-build" className="text-h2 text-textMain">
            <button type="button" aria-haspopup="dialog" disabled={session.loading} onClick={openBuilder} className="text-left cursor-pointer disabled:cursor-default after:absolute after:inset-0 after:content-['']">
              Build your own
            </button>
          </h2>
          <p className="text-sm text-muted2 [overflow-wrap:anywhere]">
            {session.loading && !launchingPreset ? 'Starting…' : <>Your setup: <span className="text-textMain tabular-nums">{builderSummary(view)}</span></>}
          </p>
        </div>
        <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-muted" />
      </Card>

      <Modal
        open={building}
        onClose={closeBuilder}
        size="lg"
        title="Build your own"
        footer={(
          <>
            <p className="mr-auto min-w-0 text-sm font-medium text-textMain tabular-nums [overflow-wrap:anywhere]">{builderSummary(view)}</p>
            <Button
              className="shrink-0"
              disabled={customDisabled}
              onClick={() => {
                setLaunchingPreset(null);
                setParams(withoutBuild, { replace: true });
                startSession(view);
              }}
            >
              Start session
            </Button>
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <Field label="Subject">
            <SegmentedControl label="Subject" value={view.studyMode === 'interleaved' ? 'All' : view.subject} onChange={(s) => build(chooseScope(view, s))} options={SUBJECT_OPTIONS} />
          </Field>

          {view.studyMode !== 'interleaved' && (
            <FormField label="Topic">
              <Select value={view.studyMode === 'subtopic' ? view.subtopic : 'All'} onChange={(e) => build(chooseScope(view, view.subject, e.target.value))}>
                <option value="All">All topics</option>
                {(safeTOS[view.subject] || []).map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
          )}

          <Grid kind="pair" gap="md" className="@lg:grid-cols-2">
            <Field label="Items">
              <SegmentedControl label="Number of questions" value={view.count} onChange={(count) => build({ ...view, count })} options={BUILDER_COUNTS.map((n) => ({ value: n, label: String(n) }))} />
            </Field>
            <Field label="Type">
              <SegmentedControl
                label="Question type"
                value={view.cognitiveFocus}
                onChange={(cognitiveFocus) => build({ ...view, cognitiveFocus })}
                options={[
                  { value: 'mixed', label: 'Mixed' },
                  { value: 'conceptual', label: 'Theory' },
                  { value: 'calculation', label: 'Calculation' },
                ]}
              />
            </Field>
            <Field label="Mode">
              <SegmentedControl
                label="Session mode"
                value={view.sessionMode}
                onChange={(sessionMode) => build({ ...view, sessionMode })}
                options={[
                  { value: 'mcq', label: 'Choice' },
                  { value: 'flashcard', label: 'Cards' },
                ]}
              />
            </Field>
            <Field label="From">
              <SegmentedControl
                label="Question source"
                value={view.source}
                onChange={(source) => build({ ...view, source })}
                options={[
                  { value: 'library', label: 'Bank' },
                  { value: 'bookmarks', label: 'Saved' },
                  { value: 'ai', label: 'AI', hint: isOnline ? undefined : 'needs a connection', disabled: !isOnline },
                ]}
              />
            </Field>
          </Grid>
        </div>
      </Modal>

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
