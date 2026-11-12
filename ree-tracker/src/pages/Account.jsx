// src/pages/Account.jsx
//
// Everything about you and this device, in one place: name, exam plan (the
// only editor for the exam date and daily target), appearance, notifications,
// offline & sync, the placement test, achievements, your data, and sign-in &
// security. It replaces Profile, which mixed these settings in with analytics
// and the planner (now in Progress) and an admin tool (now in Admin).
// Sections have anchors (/account#offline) so other screens can link straight
// to one.
import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useShallow } from 'zustand/react/shallow';
import { DISPLAY_NAME_MAX } from '@ree/shared';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { useDragScroll } from '../hooks/useDragScroll';
import { syncDashboardStats } from '../services/analyticsSync';
import { updateUserProfile } from '../services/dbQueries';
import { Page, PageHeader, Card, CardTitle, Button, FormField, Input, Skeleton } from '../components/ui';
import ErrorBoundary from '../components/ErrorBoundary';
import { lazy } from '../utils/lazyWithRetry';
import { fadeMask, useScrollFades } from '../components/ui/scrollFade';
import ThemingArchitecture from '../features/profile/ThemingArchitecture';
import CredentialsTab from '../features/profile/CredentialsTab';
import ExamPlanForm from '../features/account/ExamPlanForm';
import NotificationSettings from '../features/account/NotificationSettings';
import OfflineSyncSettings from '../features/account/OfflineSyncSettings';
import Milestones from '../features/account/Milestones';
import DataSettings from '../features/account/DataSettings';
import SecuritySettings from '../features/account/SecuritySettings';
import AppVersion from '../features/account/AppVersion';
import { forgetTourSeen, tourSeen } from '../features/onboarding/tourKey';

// Lazy: it brings the quiz parser, and most visits to Account never use it.
const BackupSettings = lazy(() => import('../features/backup/BackupSettings'));
const YourReports = lazy(() => import('../features/account/YourReports'));

// Jump links to each section: Account is nine sections long, and on a phone
// "Sign-in & security" was a long scroll down with no way to see what was there.
// One row that scrolls sideways and stays in view, so you can jump from anywhere.
// They wrapped to 200px at the top of the page and were gone once you scrolled.
// Touch scrolls the row and a mouse drags it. The edges fade where there's more.
const SECTIONS = [
  ['profile', 'Name'],
  ['exam-plan', 'Exam plan'],
  ['appearance', 'Appearance'],
  ['notifications', 'Notifications'],
  ['offline', 'Offline & sync'],
  ['placement', 'Placement test'],
  ['achievements', 'Achievements'],
  ['reports', 'Your reports'],
  ['data', 'Your data'],
  ['security', 'Sign-in & security'],
];

// Getting started back on Today, on every device (it's kept on the account).
function TourAgain({ uid, skipped }) {
  const navigate = useNavigate();
  const saveExamConfig = useStore((s) => s.saveExamConfig);
  const [busy, setBusy] = useState(false);
  const again = async () => {
    setBusy(true);
    try {
      await saveExamConfig({ tourDone: false });
      forgetTourSeen(uid);
      navigate('/');
    } catch (err) {
      toast.error(err?.message || 'Couldn’t bring it back. Try again.');
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted2">Getting started is the checklist on Today for a new account: placement test, exam date, study plan, first practice set. It leaves once all four are done, or when skipped.</p>
      {skipped && <Button variant="secondary" className="self-start" onClick={again} loading={busy} disabled={busy}>Show Getting started again</Button>}
    </div>
  );
}

function Section({ id, title, description, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-[calc(var(--sticky-top,0.75rem)+3.75rem)]">
      <Card className="p-4 sm:p-5 flex flex-col gap-3">
        <div>
          <CardTitle size="lg" id={`${id}-title`}>{title}</CardTitle>
          {description && <p className="text-sm text-muted2 mt-1">{description}</p>}
        </div>
        {children}
      </Card>
    </section>
  );
}

function NameForm({ currentUser }) {
  const { updateDisplayName } = useAuth();
  const [name, setName] = useState(currentUser?.displayName || '');
  const [saving, setSaving] = useState(false);
  const unchanged = name.trim() === (currentUser?.displayName || '');

  const save = async (e) => {
    e.preventDefault();
    const next = name.trim();
    if (!next || unchanged) return;
    setSaving(true);
    try {
      // The server row first — it's what rankings show — so a failed write
      // leaves both names unchanged rather than out of step.
      await updateUserProfile({ displayName: next });
      await updateDisplayName(next);
      toast.success('Name updated.');
    } catch (err) {
      toast.error(err?.message === '[OFFLINE]' ? 'Reconnect to change your name.' : 'Couldn’t update your name — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col sm:flex-row sm:items-end gap-3">
      <FormField label="Display name" hint="Shown on rankings and your readiness certificate." className="flex-1">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={DISPLAY_NAME_MAX} autoComplete="name" />
      </FormField>
      <Button type="submit" loading={saving} disabled={saving || unchanged || !name.trim()}>Save name</Button>
    </form>
  );
}

export default function Account() {
  const { currentUser, isAdmin } = useAuth();
  const { hash } = useLocation();
  const stripRef = useRef(null);
  const drag = useDragScroll();
  const { fade, onScroll } = useScrollFades(stripRef);
  const { stats, theme, setTheme, plainBackground, setPlainBackground } = useStore(useShallow((s) => ({
    stats: s.stats, theme: s.theme, setTheme: s.setTheme, plainBackground: s.plainBackground, setPlainBackground: s.setPlainBackground,
  })));

  // The exam plan form is keyed on the saved values, so a change saved
  // elsewhere re-seeds it — but not while it's being edited: stats landing
  // from the server mid-typing used to wipe what had been typed.
  const liveKey = `${stats?.examDate || ''}|${stats?.dailyTarget || ''}`;
  const [planDirty, setPlanDirty] = useState(false);
  const [planKey, setPlanKey] = useState(liveKey);
  if (!planDirty && planKey !== liveKey) setPlanKey(liveKey);

  // Achievements and the exam plan read store stats; hydrate them from the
  // server aggregate so a new device isn't blank.
  useEffect(() => {
    if (currentUser?.uid && navigator.onLine) syncDashboardStats(currentUser.uid).catch(() => {});
  }, [currentUser?.uid]);

  return (
    <Page width="narrow">
      <PageHeader title="Account" subtitle={currentUser?.email || undefined} />

      {/* The fade is on the inner row, so the sticky background behind it stays
          whole and the page doesn't show through as it scrolls under. */}
      <nav aria-label="Account sections" className="sticky top-[var(--sticky-top,0.75rem)] z-20 py-2 rounded-[var(--radius-default)] bg-bg/90 backdrop-blur-sm reduce-transparency:bg-bg reduce-transparency:backdrop-blur-none">
        <div ref={stripRef} onScroll={onScroll} {...drag} style={fadeMask(fade)} className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[...SECTIONS, ...(isAdmin ? [['admin', 'Admin']] : [])].map(([id, label]) => (
            <Link
              key={id}
              to={{ hash: id }}
              aria-current={hash === `#${id}` ? 'location' : undefined}
              className="touch-target shrink-0 whitespace-nowrap inline-flex items-center px-3 py-1.5 rounded-full border border-border bg-surface2 text-xs font-medium text-muted2 hover:text-textMain hover:bg-surface3 aria-[current]:text-[var(--accent-text)] aria-[current]:border-[color-mix(in_srgb,var(--accent)_45%,transparent)] transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <Section id="profile" title="Your name">
        <NameForm currentUser={currentUser} />
      </Section>

      <Section id="exam-plan" title="Exam plan" description="Your board exam date and how many questions a day you aim for. Today, the forecast and your study plan all use these.">
        <ExamPlanForm key={planKey} onDirtyChange={setPlanDirty} offerPlan />
      </Section>

      <Section id="appearance" title="Appearance">
        <ThemingArchitecture theme={theme} setTheme={setTheme} plainBackground={plainBackground} setPlainBackground={setPlainBackground} />
      </Section>

      <Section id="notifications" title="Notifications">
        <NotificationSettings />
      </Section>

      <Section id="offline" title="Offline & sync">
        <OfflineSyncSettings />
      </Section>

      <Section id="placement" title="Placement test" description="About 19 adaptive questions that place each subject against the PRC passing marks. Retake it any time.">
        <Button as={Link} to="/diagnostic" variant="secondary" className="self-start">Open placement test</Button>
      </Section>

      <Section id="achievements" title="Achievements">
        <Milestones />
        <CredentialsTab currentUser={currentUser} />
      </Section>

      <Section id="reports" title="Your reports" description="Questions you reported with Report a problem, and what was done about each.">
        <ErrorBoundary name="Your reports">
          <Suspense fallback={<Skeleton className="h-24" />}>
            <YourReports />
          </Suspense>
        </ErrorBoundary>
      </Section>

      <Section id="data" title="Your data">
        <div className="flex flex-col gap-5 min-w-0">
          <ErrorBoundary name="Backup">
            <Suspense fallback={<Skeleton className="h-40" />}>
              <BackupSettings />
            </Suspense>
          </ErrorBoundary>
          <div className="border-t border-border2/60 pt-5">
            <DataSettings />
          </div>
        </div>
      </Section>

      <Section id="security" title="Sign-in & security">
        <SecuritySettings />
      </Section>

      <Section id="about" title="About this app">
        <TourAgain uid={currentUser?.uid} skipped={!!stats?.tourDoneAt || tourSeen(currentUser?.uid)} />
        <AppVersion />
      </Section>

      {isAdmin && (
        <Section id="admin" title="Admin" description="Question bank, explanation review, formula cards and handouts.">
          <Button as={Link} to="/admin" variant="secondary" className="self-start">Open admin tools</Button>
        </Section>
      )}
    </Page>
  );
}
