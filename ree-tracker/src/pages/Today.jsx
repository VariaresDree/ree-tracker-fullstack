// src/pages/Today.jsx
//
// The home screen answers one question: what should I do now? It shows the
// exam countdown, the streak, and the Today card (readiness, pass chance,
// today's target, and the next steps, today's plan task included).
//
// It used to be an eleven-card dashboard. Pass chance and the projected
// average appeared twice, today's target three times, and "Next best actions"
// overlapped "Today's prescription". The analytics moved to Progress, the past
// sittings to Exams, and the daily-target editor to Account.
//
// The countdown names the review phase (CELE round, 2026-10), and opens the
// review playbook for it.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import TodayPanel from '../features/today/TodayPanel';
import SyllabusCoverageLink from '../features/syllabus/SyllabusCoverageLink';
import { daysToExam } from '../features/today/todayActions';
import { usePlanCalendar } from '../features/study-plan/usePlanCalendar';
import { inDaysLabel } from '../features/study-plan/keyDateLabels';
import { nextKeyDate, reviewPhase, todayManila } from '@ree/shared';
import ReviewPlaybook from '../features/today/ReviewPlaybook';
import { TodaySkeleton } from '../components/SkeletonLoaders';
import StatsUnavailable from '../components/StatsUnavailable';
import { Page, PageHeader, StatusPill } from '../components/ui';
import { CalendarDays, Flame } from '../components/ui/icons';

function examLabel(days) {
  if (days < 0) return { tone: 'danger', text: 'Exam date has passed' };
  if (days === 0) return { tone: 'amber', text: 'Exam today' };
  return { tone: days <= 14 ? 'amber' : 'success', text: `${days} day${days === 1 ? '' : 's'} to the exam` };
}

// The calendar is read at most this often here (Today is the boot screen).
const CALENDAR_FRESH_MS = 30 * 60 * 1000;

/** "Preboard 2 in 5 days", "Final coaching today": the next date on the learner's calendar. */
const nextDateText = (next) => (next ? `${next.entry.title} ${inDaysLabel(next.inDays)}` : null);

function ExamCountdown({ examDate, next, reviewMode }) {
  const [open, setOpen] = useState(false);
  const days = daysToExam(examDate);
  const phase = reviewPhase(days);
  if (days == null) {
    return (
      <Link to="/account#exam-plan" className="touch-target inline-flex items-center text-xs text-muted2 hover:text-textMain hover:underline underline-offset-2">
        Set your exam date
      </Link>
    );
  }
  const { tone, text } = examLabel(days);
  const pill = (
    <StatusPill tone={tone} dot={false}>
      <CalendarDays size={13} strokeWidth={2} aria-hidden="true" /> {phase ? `${phase.label} · ` : ''}{text}{next ? ` · ${next}` : ''}
    </StatusPill>
  );
  if (!phase) return pill;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${phase.label} phase, ${text}${next ? `, ${next}` : ''}. Open the review playbook`}
        className="touch-target inline-flex items-center rounded-full cursor-pointer hover:opacity-90"
      >
        {pill}
      </button>
      {open && <ReviewPlaybook open phase={phase} daysLeft={days} reviewMode={reviewMode} onClose={() => setOpen(false)} />}
    </>
  );
}

export default function Today() {
  const { currentUser } = useAuth();
  const { activeStats, readiness, readinessSettled, loading, unavailable, retry, kpi, today } = useDashboardStats({ withReadiness: true });
  const calendar = usePlanCalendar({ fetchIfOlderThanMs: CALENDAR_FRESH_MS });

  if (loading) return <TodaySkeleton />;
  if (unavailable) {
    return (
      <Page>
        <PageHeader title="Today" subtitle={`Welcome back, ${currentUser?.displayName || 'Reviewer'}.`} />
        <StatsUnavailable onRetry={retry} />
      </Page>
    );
  }

  // "Welcome back" on someone's very first visit read oddly.
  const greeting = kpi.answered > 0 ? 'Welcome back' : 'Welcome';
  return (
    <Page>
      <PageHeader
        title="Today"
        subtitle={`${greeting}, ${currentUser?.displayName || 'Reviewer'}.`}
        meta={
          <>
            <ExamCountdown examDate={activeStats.examDate} next={nextDateText(nextKeyDate(calendar.items, today || todayManila()))} reviewMode={calendar.prefs.reviewMode} />
            <SyllabusCoverageLink />
            {kpi.streak > 0 && (
              <StatusPill tone="amber" dot={false}>
                <Flame size={13} strokeWidth={2} aria-hidden="true" /> {kpi.streak}-day streak
              </StatusPill>
            )}
          </>
        }
      />

      {/* Keyed on the date so a new day remounts the panel: the forecast,
          due reviews, plan task and readiness trend all refetch. */}
      <TodayPanel key={today} today={today} stats={activeStats} readiness={readiness} readinessSettled={readinessSettled} uid={currentUser?.uid} answered={kpi.answered} />
    </Page>
  );
}
