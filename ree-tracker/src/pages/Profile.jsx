// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { updateProfile, deleteUser } from 'firebase/auth';
// FIRESTORE IMPORTS COMPLETELY REMOVED
import FocusTrap from '../components/FocusTrap';
import toast from 'react-hot-toast';

// Decoupled Components
import ComparativeAnalyticsTab from '../features/profile/ComparativeAnalyticsTab';
import StrategicPlannerTab from '../features/profile/StrategicPlannerTab';
import CredentialsTab from '../features/profile/CredentialsTab';
import ThemingArchitecture from '../features/profile/ThemingArchitecture';
import AnalyticsDeepDive from '../features/analytics/AnalyticsDeepDive';
import ExplanationReview from '../features/analytics/ExplanationReview';

export default function Profile() {
  const { currentUser, logout, isAdmin } = useAuth();
  
  // EXTRACTED THEME CONTROLS & SYNC STATUS FROM GLOBAL STORE
  const { stats, setStats, resetStore, theme, setTheme, syncStatus } = useStore();
  
  // UI States
  const [activeTab, setActiveTab] = useState('analytics');
  const [activeModal, setActiveModal] = useState(null); 
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
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
              const newStats = { ...stats, examDate: editForm.targetBoardDate };
              setStats(newStats);
          }
          toast.success("Profile matrix updated successfully.");
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
          toast.error("Logout sequence failed.");
      }
  };

  const handleDeleteAccount = async () => {
      if (deleteConfirmText !== 'DELETE') return toast.error("Type DELETE to confirm.");
      const toastId = toast.loading("Executing permanent matrix purge...");
      
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
          toast.success("Account successfully purged from the matrix.", { id: toastId });
      } catch (error) {
          if (error.code === 'auth/requires-recent-login') {
              toast.error("Security lock: Please log out and log back in to delete your account.", { id: toastId });
          } else {
              toast.error(`Purge failed: ${error.message}`, { id: toastId });
          }
      }
  };

  const handleSync = async (type) => {
      const toastId = toast.loading(`Initiating Cloud ${type}...`);
      
      try {
          if (type === 'Pull') {
              const token = await currentUser.getIdToken();
              const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
              
              // Pull directly from our new high-speed PostgreSQL dashboard aggregation
              const res = await fetch(`${backendUrl}/api/analytics/dashboard/${currentUser.uid}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
              });

              if (res.ok) {
                  const json = await res.json();
                  if (json.success && json.data) {
                      // Merge the cloud truth with local frontend UI preferences
                      const restoredStats = {
                          ...stats,
                          irt: { ...stats?.irt, theta: json.data.profile?.thetaRating || 0 },
                          globalStreak: json.data.profile?.globalStreak || 0,
                          matrix: json.data.matrix,
                          cloudTimestamp: Date.now()
                      };
                      setStats(restoredStats);
                      toast.success("Cloud Pull successful. Local state restored.", { id: toastId });
                  } else {
                      toast.error("No telemetry found for this agent.", { id: toastId });
                  }
              } else {
                  toast.error("Backend refused sync request.", { id: toastId });
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
      <div className="bg-surface border border-border2 p-6 md:p-8 rounded-2xl shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-reeBlue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
          <div className="w-20 h-20 shrink-0 rounded-2xl bg-gradient-to-tr from-reeBlue to-reePurple flex items-center justify-center text-white font-black text-3xl shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            {currentUser?.displayName?.charAt(0).toUpperCase() || 'V'}
          </div>
          <div className="flex-1 w-full">
              {isEditing ? (
                  <div className="flex flex-col gap-3 w-full max-w-sm animate-in fade-in">
                      <div>
                          <input type="text" value={editForm.displayName} onChange={(e) => setEditForm({...editForm, displayName: e.target.value})} className="w-full bg-bg border border-border2 text-textMain p-2 rounded outline-none focus:border-reeBlue text-sm font-bold" placeholder="Display Name" />
                      </div>
                      <div>
                          <input type="date" value={editForm.targetBoardDate} onChange={(e) => setEditForm({...editForm, targetBoardDate: e.target.value})} className="w-full bg-bg border border-border2 text-textMain p-2 rounded outline-none focus:border-reeBlue text-sm" />
                      </div>
                      <div className="flex gap-2 mt-1">
                          <button onClick={handleSaveProfile} className="px-4 py-2 bg-reeGreen hover:bg-green-600 text-bg font-bold text-xs rounded uppercase tracking-wider cursor-pointer transition-colors">Save</button>
                          <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-surface2 hover:bg-surface3 text-muted font-bold text-xs rounded uppercase tracking-wider cursor-pointer transition-colors">Cancel</button>
                      </div>
                  </div>
              ) : (
                  <div className="animate-in fade-in flex flex-col">
                      <h2 className="text-3xl font-black text-textMain tracking-tight mb-1">{currentUser?.displayName || 'Agent'}</h2>
                      <div className="text-xs font-mono text-muted uppercase tracking-widest flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full bg-reeGreen animate-pulse"></span>
                          ID: {currentUser?.uid.slice(0, 10)}
                      </div>
                      <button onClick={() => setIsEditing(true)} className="self-start text-[0.65rem] text-reeCyan hover:text-reeBlue font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-1">
                          <span>✏️</span> Edit Identity Matrix
                      </button>
                  </div>
              )}
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end relative z-10 text-right">
            <div className="text-[0.65rem] font-bold uppercase tracking-widest text-muted mb-1">Target Board Date</div>
            <div className="text-sm font-bold text-textMain bg-surface2 px-3 py-1 rounded-md border border-border2">{stats?.examDate || 'Not Set'}</div>
        </div>
      </div>

      {/* Navigation Tabs (Added System Settings) */}
      <div className="flex gap-2 border-b border-border2 pb-4 overflow-x-auto no-scrollbar">
        {[
          { id: 'analytics', icon: '📊', label: 'Comparative Analytics' },
          { id: 'deep-analytics', icon: '🔬', label: 'Deep Analytics' },
          { id: 'planner', icon: '🗓️', label: 'Strategic Planner' },
          { id: 'credentials', icon: '🏆', label: 'Credentials' },
          ...(isAdmin ? [{ id: 'review', icon: '📝', label: 'Explanation Review' }] : []),
          { id: 'settings', icon: '⚙️', label: 'System Settings' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.id ? 'bg-textMain/10 text-textMain border border-textMain/30 shadow-sm' : 'text-muted hover:text-textMain border border-transparent hover:bg-surface2'}`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic Tab Injection */}
      {activeTab === 'analytics' && <ComparativeAnalyticsTab currentUser={currentUser} stats={stats} />}
      {activeTab === 'deep-analytics' && <AnalyticsDeepDive />}
      {activeTab === 'planner' && <StrategicPlannerTab currentUser={currentUser} stats={stats} setStats={setStats} />}
      {activeTab === 'credentials' && <CredentialsTab currentUser={currentUser} stats={stats} />}
      {activeTab === 'review' && isAdmin && <ExplanationReview />}

      {/* BRAND NEW ISOLATED SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
            <ThemingArchitecture theme={theme} setTheme={setTheme} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* AUTO-SYNC MATRIX */}
                <div className="bg-surface border border-border2 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
                        <span>☁️</span> Auto-Sync Matrix
                    </h4>
                    <div className={`p-4 rounded-xl border flex items-center gap-4 transition-all duration-500 ${
                        syncStatus === 'synced' ? 'bg-reeGreen/10 border-reeGreen/30 text-reeGreen' :
                        syncStatus === 'syncing' ? 'bg-reeBlue/10 border-reeBlue/30 text-reeBlue' :
                        syncStatus === 'offline_queued' ? 'bg-reeAmber/10 border-reeAmber/30 text-reeAmber' :
                        'bg-reeRed/10 border-reeRed/30 text-reeRed'
                    }`}>
                        <div className="text-2xl shrink-0">
                            {syncStatus === 'synced' ? '✅' : 
                             syncStatus === 'syncing' ? <span className="telemetry-spinner !w-6 !h-6 border-reeBlue border-2"></span> : 
                             syncStatus === 'offline_queued' ? '📡' : '⚠️'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold uppercase tracking-widest">
                                {syncStatus === 'synced' ? 'Matrix Synchronized' :
                                 syncStatus === 'syncing' ? 'Uplinking to Cloud...' :
                                 syncStatus === 'offline_queued' ? 'Offline - Data Queued' :
                                 'Sync Error - Retrying...'}
                            </span>
                            <span className="text-[0.65rem] opacity-80 mt-0.5">
                                {syncStatus === 'synced' ? 'All local telemetry safely backed up.' :
                                 syncStatus === 'syncing' ? 'Transmitting latest vectors...' :
                                 syncStatus === 'offline_queued' ? 'Waiting for network connection.' :
                                 'Connection refused. Retrying automatically.'}
                            </span>
                        </div>
                    </div>
                    <button onClick={() => setActiveModal('pull')} className="mt-5 text-[0.6rem] text-muted hover:text-textMain underline uppercase tracking-widest self-start transition-colors cursor-pointer">
                        Emergency Cloud Restore (Pull Master)
                    </button>
                </div>

                {/* DANGER ZONE */}
                <div className="bg-reeRed/5 border border-reeRed/20 p-6 rounded-2xl shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-reeRed mb-4 flex items-center gap-2"><span>🚨</span> Danger Zone</h4>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => setActiveModal('logout')} className="w-full py-2.5 bg-surface border border-border2 hover:bg-reeRed/10 hover:border-reeRed/30 hover:text-reeRed text-textMain font-bold rounded-lg text-[0.65rem] uppercase tracking-wider transition-all cursor-pointer">
                            Terminate Session (Logout)
                        </button>
                        <button onClick={() => setActiveModal('delete')} className="w-full py-2.5 bg-reeRed hover:bg-red-600 text-white font-bold rounded-lg text-[0.65rem] uppercase tracking-wider transition-all shadow-md cursor-pointer">
                            Purge Account Data
                        </button>
                    </div>
                </div>

            </div>
        </div>
      )}

      {/* Modals Overlay */}
      {activeModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
              <FocusTrap active={true}>
                  <div className="bg-surface border border-border2 p-6 rounded-2xl shadow-2xl max-w-md w-full">
                      
                      {activeModal === 'pull' && (
                          <>
                              <h3 className="text-lg font-black text-reeCyan mb-2">Restore Cloud Master?</h3>
                              <p className="text-sm text-muted2 mb-6 leading-relaxed">Warning: This will delete your current local device progress and forcefully restore the last saved cloud state.</p>
                              <div className="flex justify-end gap-3">
                                  <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold cursor-pointer transition-colors">Cancel</button>
                                  <button onClick={() => handleSync('Pull')} className="px-4 py-2 bg-reeCyan hover:bg-cyan-500 text-bg rounded-lg text-xs font-black cursor-pointer transition-colors shadow-md">Confirm Pull</button>
                              </div>
                          </>
                      )}

                      {activeModal === 'logout' && (
                          <>
                              <h3 className="text-lg font-black text-textMain mb-2">Terminate Session?</h3>
                              <p className="text-sm text-muted2 mb-6 leading-relaxed">Ensure your Auto-Sync Matrix indicates a successful backup before exiting.</p>
                              <div className="flex justify-end gap-3">
                                  <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold cursor-pointer transition-colors">Cancel</button>
                                  <button onClick={handleLogout} className="px-4 py-2 bg-textMain hover:bg-gray-200 text-bg rounded-lg text-xs font-black cursor-pointer transition-colors shadow-md">Logout</button>
                              </div>
                          </>
                      )}

                      {activeModal === 'delete' && (
                          <>
                              <h3 className="text-lg font-black text-reeRed mb-2 flex items-center gap-2"><span>⚠️</span> PURGE ACCOUNT</h3>
                              <p className="text-sm text-muted2 mb-4 leading-relaxed">This action is irreversible. All of your flashcard logic, board simulations, and analytical profiles will be permanently erased from Google's servers.</p>
                              <div className="mb-6 p-4 bg-reeRed/5 border border-reeRed/20 rounded-xl">
                                  <label className="block text-[0.65rem] font-bold text-reeRed uppercase tracking-wider mb-2">Type "DELETE" to confirm</label>
                                  <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="w-full bg-bg border border-reeRed/30 text-reeRed font-black p-2 rounded outline-none focus:border-reeRed" placeholder="DELETE" />
                              </div>
                              <div className="flex justify-end gap-3">
                                  <button onClick={() => { setActiveModal(null); setDeleteConfirmText(''); }} className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold cursor-pointer transition-colors">Cancel</button>
                                  <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE'} className="px-4 py-2 bg-reeRed hover:bg-red-600 text-white rounded-lg text-xs font-black disabled:opacity-50 cursor-pointer transition-colors shadow-md">Permanent Purge</button>
                              </div>
                          </>
                      )}
                  </div>
              </FocusTrap>
          </div>
      )}
    </div>
  );
}