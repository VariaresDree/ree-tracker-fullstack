// src/pages/Profile.jsx
import { lazy, Suspense, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { updateProfile, deleteUser } from 'firebase/auth';
// FIRESTORE IMPORTS COMPLETELY REMOVED
import { Skeleton, Button, Modal, FormField, Input, Tabs, StatusPill } from '../components/ui';
import { Pencil, BarChart3, Activity, CalendarDays, Award, ClipboardList, Settings2, Cloud, TriangleAlert } from '../components/ui/icons';
import toast from 'react-hot-toast';
import { syncDashboardStats } from '../services/analyticsSync';

// Decoupled Components
import ComparativeAnalyticsTab from '../features/profile/ComparativeAnalyticsTab';
import StrategicPlannerTab from '../features/profile/StrategicPlannerTab';
import CredentialsTab from '../features/profile/CredentialsTab';
import ThemingArchitecture from '../features/profile/ThemingArchitecture';
// Lazy: pulls Recharts only when the corresponding tab is opened.
const AnalyticsDeepDive = lazy(() => import('../features/analytics/AnalyticsDeepDive'));
const ExplanationReview = lazy(() => import('../features/analytics/ExplanationReview'));

const TabFallback = () => (
  <div className="space-y-3 py-4">
    <Skeleton className="h-7 w-1/3" />
    <Skeleton className="h-40" />
    <Skeleton className="h-24" />
  </div>
);

export default function Profile() {
  const { currentUser, logout, isAdmin } = useAuth();
  
  // EXTRACTED THEME CONTROLS & SYNC STATUS FROM GLOBAL STORE. Narrow selector so
  // Profile doesn't re-render on unrelated store changes (syncQueue pushes, etc.).
  const { stats, setStats, saveExamConfig, resetStore, theme, setTheme, syncStatus } = useStore(
    useShallow((s) => ({
      stats: s.stats,
      setStats: s.setStats,
      saveExamConfig: s.saveExamConfig,
      resetStore: s.resetStore,
      theme: s.theme,
      setTheme: s.setTheme,
      syncStatus: s.syncStatus,
    })),
  );
  
  // UI States
  const [activeTab, setActiveTab] = useState('analytics');
  const [activeModal, setActiveModal] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Hydrate the store with the server's dashboard aggregate on mount, exactly
  // like the Dashboard does — the Consistency Matrix, milestones, and streak
  // read store stats, which used to hold only locally-accumulated values (so
  // a new device rendered an empty Profile even with months of server data).
  useEffect(() => {
    if (currentUser?.uid && navigator.onLine) {
      syncDashboardStats(currentUser.uid).catch(() => {});
    }
  }, [currentUser?.uid]);
  
  // Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
      displayName: currentUser?.displayName || '',
      targetBoardDate: stats?.examDate || '2026-04-01'
  });

  // Global Push Notification Engine (Runs in shell to remain constantly active)
  useEffect(() => {
    const tasks = stats?.tasks || [];
    if (tasks.length > 0 && "Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            const today = new Date().toISOString().split('T')[0];
            const urgentTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate <= today);
            
            if (urgentTasks.length > 0 && !sessionStorage.getItem('notified_today')) {
                new Notification("REE.ai Operations", {
                    body: `Agent, you have ${urgentTasks.length} pending milestone(s) due today or overdue.`,
                    icon: '/favicon.ico'
                });
                sessionStorage.setItem('notified_today', 'true');
            }
        }
      });
    }
  }, [stats?.tasks]);

  // Handlers
  const handleSaveProfile = async () => {
      try {
          if (editForm.displayName !== currentUser.displayName) {
              await updateProfile(currentUser, { displayName: editForm.displayName });
          }
          if (editForm.targetBoardDate !== stats?.examDate) {
              // Persist through the single source of truth so the exam date
              // survives refresh and syncs to Dashboard + Strategic Planner.
              await saveExamConfig({ examDate: editForm.targetBoardDate });
          }
          toast.success("Profile updated.");
          setIsEditing(false);
      } catch (error) {
          toast.error(`Update failed: ${error.message}`);
      }
  };

  const handleLogout = async () => {
      try {
          await logout();
          resetStore();
      } catch (error) {
          toast.error("Log out failed.");
      }
  };

  const handleDeleteAccount = async () => {
      if (deleteConfirmText !== 'DELETE') return toast.error("Type DELETE to confirm.");
      const toastId = toast.loading("Deleting your account…");
      
      try {
          // 1. Alert the backend to purge the PostgreSQL user record
          const token = await currentUser.getIdToken();
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
          
          await fetch(`${backendUrl}/api/user/profile`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          }).catch(() => console.warn("Backend purge failed or route missing. Proceeding with Auth wipe."));

          // 2. Terminate the Firebase Authentication Identity
          await deleteUser(currentUser);
          resetStore();
          toast.success("Account deleted.", { id: toastId });
      } catch (error) {
          if (error.code === 'auth/requires-recent-login') {
              toast.error("For security, log out and back in before deleting your account.", { id: toastId });
          } else {
              toast.error(`Delete failed: ${error.message}`, { id: toastId });
          }
      }
  };

  const handleSync = async (type) => {
      const toastId = toast.loading("Restoring from cloud backup…");

      try {
          if (type === 'Pull') {
              // Same shared sync the Dashboard uses — restores EVERYTHING the
              // server has (calendar, matrix, microTopics, streak, theta,
              // history), not just the three fields the old handler copied.
              const restored = await syncDashboardStats(currentUser.uid);
              if (restored) {
                  toast.success("Restored from cloud backup.", { id: toastId });
              } else {
                  toast.error("No cloud backup found for this account.", { id: toastId });
              }
          }
      } catch (err) {
          toast.error(`Sync failed: ${err.message}`, { id: toastId });
      }
      setActiveModal(null);
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 page-fade-in pb-12 w-full pt-4">
      
      {/* Identity Header */}
      <div className="bg-surface border border-border2 p-6 md:p-8 rounded-[var(--radius-lg)] shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}></div>
        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
          <div
            className="w-20 h-20 shrink-0 rounded-[var(--radius-lg)] flex items-center justify-center text-white font-bold text-3xl elevate-glow"
            style={{ background: 'linear-gradient(to top right, var(--accent), var(--accent-signal))' }}
          >
            {currentUser?.displayName?.charAt(0).toUpperCase() || 'V'}
          </div>
          <div className="flex-1 w-full">
              {isEditing ? (
                  <div className="flex flex-col gap-3 w-full max-w-sm animate-in fade-in">
                      <FormField label="Display name">
                          <Input type="text" value={editForm.displayName} onChange={(e) => setEditForm({...editForm, displayName: e.target.value})} placeholder="Display name" />
                      </FormField>
                      <FormField label="Exam date">
                          <Input type="date" value={editForm.targetBoardDate} onChange={(e) => setEditForm({...editForm, targetBoardDate: e.target.value})} />
                      </FormField>
                      <div className="flex gap-2 mt-1">
                          <Button size="sm" tone="success" onClick={handleSaveProfile}>Save</Button>
                          <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                      </div>
                  </div>
              ) : (
                  <div className="animate-in fade-in flex flex-col">
                      <h2 className="text-display text-3xl text-textMain tracking-tight mb-1">{currentUser?.displayName || 'Reviewer'}</h2>
                      <div className="text-eyebrow flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-success)' }}></span>
                          ID: {currentUser?.uid.slice(0, 10)}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="self-start text-muted hover:text-textMain -ml-2">
                          <Pencil size={14} strokeWidth={1.75} aria-hidden="true" /> Edit profile
                      </Button>
                  </div>
              )}
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end relative z-10 text-right">
            <div className="text-eyebrow mb-1">Exam date</div>
            <div className="text-sm font-bold text-textMain bg-surface2 px-3 py-1 rounded-[var(--radius-sm)] border border-border2 tabular-nums">{stats?.examDate || 'Not set'}</div>
        </div>
      </div>

      {/* Section tabs */}
      <Tabs
        label="Profile sections"
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'analytics', label: 'Comparative analytics', icon: BarChart3 },
          { id: 'deep-analytics', label: 'Deep analytics', icon: Activity },
          { id: 'planner', label: 'Planner', icon: CalendarDays },
          { id: 'credentials', label: 'Credentials', icon: Award },
          ...(isAdmin ? [{ id: 'review', label: 'Explanation review', icon: ClipboardList }] : []),
          { id: 'settings', label: 'Settings', icon: Settings2 },
        ]}
      />

      {/* Dynamic Tab Injection */}
      {activeTab === 'analytics' && <ComparativeAnalyticsTab currentUser={currentUser} stats={stats} />}
      {activeTab === 'deep-analytics' && (
        <Suspense fallback={<TabFallback />}>
          <AnalyticsDeepDive />
        </Suspense>
      )}
      {activeTab === 'planner' && <StrategicPlannerTab currentUser={currentUser} stats={stats} setStats={setStats} />}
      {activeTab === 'credentials' && <CredentialsTab currentUser={currentUser} stats={stats} />}
      {activeTab === 'review' && isAdmin && (
        <Suspense fallback={<TabFallback />}>
          <ExplanationReview />
        </Suspense>
      )}

      {/* BRAND NEW ISOLATED SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
            <ThemingArchitecture theme={theme} setTheme={setTheme} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Cloud backup */}
                <div className="bg-surface border border-border p-6 rounded-[var(--radius-lg)] shadow-sm flex flex-col justify-center">
                    <h4 className="text-sm font-semibold text-textMain mb-4 flex items-center gap-2">
                        <Cloud size={16} strokeWidth={1.75} aria-hidden="true" className="text-[var(--accent-signal)]" /> Cloud backup
                    </h4>
                    <div className="p-4 rounded-[var(--radius-default)] border border-border bg-surface2/50 flex items-center gap-4 transition-all duration-500">
                        <StatusPill
                            tone={
                                syncStatus === 'synced' ? 'success' :
                                syncStatus === 'syncing' ? 'signal' :
                                syncStatus === 'offline_queued' ? 'amber' : 'danger'
                            }
                        >
                            {syncStatus === 'synced' ? 'Backed up' :
                             syncStatus === 'syncing' ? 'Syncing…' :
                             syncStatus === 'offline_queued' ? 'Offline — changes queued' :
                             'Sync error — retrying'}
                        </StatusPill>
                        <span className="text-xs text-muted2">
                            {syncStatus === 'synced' ? 'All progress is safely backed up.' :
                             syncStatus === 'syncing' ? 'Sending your latest answers…' :
                             syncStatus === 'offline_queued' ? 'Will sync when you reconnect.' :
                             'Retrying automatically.'}
                        </span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setActiveModal('pull')} className="mt-4 self-start text-muted hover:text-textMain -ml-2">
                        Restore from cloud backup…
                    </Button>
                </div>

                {/* Danger zone */}
                <div
                    className="border p-6 rounded-[var(--radius-lg)] shadow-sm"
                    style={{
                        background: 'color-mix(in srgb, var(--accent-danger) 5%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--accent-danger) 20%, transparent)',
                    }}
                >
                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--accent-danger)' }}>
                        <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" /> Danger zone
                    </h4>
                    <div className="flex flex-col gap-3">
                        <Button fullWidth variant="secondary" onClick={() => setActiveModal('logout')}>
                            Log out
                        </Button>
                        <Button fullWidth tone="danger" onClick={() => setActiveModal('delete')}>
                            Delete account…
                        </Button>
                    </div>
                </div>

            </div>
        </div>
      )}

      {/* Confirmation dialogs */}
      <Modal
          open={activeModal === 'pull'}
          onClose={() => setActiveModal(null)}
          icon={Cloud}
          title="Restore from cloud backup?"
          footer={
              <>
                  <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
                  <Button onClick={() => handleSync('Pull')}>Restore backup</Button>
              </>
          }
      >
          <p className="text-sm text-muted2 leading-relaxed">
              This replaces the progress stored on this device with your last cloud backup.
          </p>
      </Modal>

      <Modal
          open={activeModal === 'logout'}
          onClose={() => setActiveModal(null)}
          title="Log out?"
          footer={
              <>
                  <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
                  <Button onClick={handleLogout}>Log out</Button>
              </>
          }
      >
          <p className="text-sm text-muted2 leading-relaxed">
              Make sure your cloud backup shows “Backed up” before leaving so nothing is lost.
          </p>
      </Modal>

      <Modal
          open={activeModal === 'delete'}
          onClose={() => { setActiveModal(null); setDeleteConfirmText(''); }}
          tone="danger"
          icon={TriangleAlert}
          title="Delete account?"
          footer={
              <>
                  <Button variant="secondary" onClick={() => { setActiveModal(null); setDeleteConfirmText(''); }}>Cancel</Button>
                  <Button tone="danger" disabled={deleteConfirmText !== 'DELETE'} onClick={handleDeleteAccount}>
                      Delete permanently
                  </Button>
              </>
          }
      >
          <p className="text-sm text-muted2 mb-4 leading-relaxed">
              This can't be undone. Your flashcards, board simulations, and analytics will be permanently erased.
          </p>
          <FormField label='Type "DELETE" to confirm'>
              <Input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="font-bold"
                  style={{ color: 'var(--accent-danger)' }}
              />
          </FormField>
      </Modal>
    </div>
  );
}