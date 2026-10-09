// src/pages/Account.jsx
//
// Everything about you and this device, in one place: name, exam plan (the
// only editor for the exam date and daily target), appearance, notifications,
// offline & sync, the placement test, achievements, your data, and sign-in &
// security. It replaces Profile, which mixed these settings in with analytics
// and the planner (now in Progress) and an admin tool (now in Admin).
// Sections have anchors (/account#offline) so other screens can link straight
// to one.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { updateProfile } from 'firebase/auth';
import { useShallow } from 'zustand/react/shallow';
import { DISPLAY_NAME_MAX } from '@ree/shared';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { syncDashboardStats } from '../services/analyticsSync';
import { updateUserProfile } from '../services/dbQueries';
import { PageHeader, Card, Button, FormField, Input } from '../components/ui';
import ThemingArchitecture from '../features/profile/ThemingArchitecture';
import CredentialsTab from '../features/profile/CredentialsTab';
import ExamPlanForm from '../features/account/ExamPlanForm';
import NotificationSettings from '../features/account/NotificationSettings';
import OfflineSyncSettings from '../features/account/OfflineSyncSettings';
import Milestones from '../features/account/Milestones';
import DataSettings from '../features/account/DataSettings';
import SecuritySettings from '../features/account/SecuritySettings';

function Section({ id, title, description, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20">
      <Card className="p-5 sm:p-6 flex flex-col gap-4">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-semibold text-textMain">{title}</h2>
          {description && <p className="text-sm text-muted2 mt-1">{description}</p>}
        </div>
        {children}
      </Card>
    </section>
  );
}

function NameForm({ currentUser }) {
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
      await updateProfile(currentUser, { displayName: next });
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
  const { stats, theme, setTheme } = useStore(useShallow((s) => ({ stats: s.stats, theme: s.theme, setTheme: s.setTheme })));

  // Achievements and the exam plan read store stats; hydrate them from the
  // server aggregate so a new device isn't blank.
  useEffect(() => {
    if (currentUser?.uid && navigator.onLine) syncDashboardStats(currentUser.uid).catch(() => {});
  }, [currentUser?.uid]);

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 w-full max-w-3xl mx-auto pt-4">
      <PageHeader title="Account" subtitle={currentUser?.email || undefined} />

      <Section id="profile" title="Your name">
        <NameForm currentUser={currentUser} />
      </Section>

      <Section id="exam-plan" title="Exam plan" description="Your board exam date and how many questions a day you aim for. Today, the forecast and your study plan all use these.">
        {/* Keyed on the saved values: a change saved elsewhere re-seeds the form. */}
        <ExamPlanForm key={`${stats?.examDate || ''}|${stats?.dailyTarget || ''}`} />
      </Section>

      <Section id="appearance" title="Appearance">
        <ThemingArchitecture theme={theme} setTheme={setTheme} />
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

      <Section id="data" title="Your data">
        <DataSettings />
      </Section>

      <Section id="security" title="Sign-in & security">
        <SecuritySettings />
      </Section>

      {isAdmin && (
        <Section id="admin" title="Admin" description="Question bank, explanation review, formula cards and handouts.">
          <Button as={Link} to="/admin" variant="secondary" className="self-start">Open admin tools</Button>
        </Section>
      )}
    </div>
  );
}
