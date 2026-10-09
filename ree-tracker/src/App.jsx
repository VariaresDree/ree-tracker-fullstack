// src/App.jsx
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useSyncLifecycle } from './hooks/useSyncLifecycle';
import { Toaster } from 'react-hot-toast';

import ErrorBoundary from './components/ErrorBoundary';
import RouteFallback from './components/RouteFallback';
import { TodaySkeleton } from './components/SkeletonLoaders';
import MainLayout from './layouts/MainLayout';
import NotificationOptIn from './components/NotificationOptIn';
import Login from './pages/Login';
import LegacyRedirect from './routes/LegacyRedirect';
import AdminRoute from './routes/AdminRoute';
import { materialsTarget } from './routes/legacyRoutes';

// Lazy Loaded Pages
const Today = lazy(() => import('./pages/Today'));
const Practice = lazy(() => import('./pages/Practice'));
const Exams = lazy(() => import('./pages/Exams'));
const Progress = lazy(() => import('./pages/Progress'));
const BoardSimulator = lazy(() => import('./pages/BoardSimulator'));
const Library = lazy(() => import('./pages/Library'));
const Account = lazy(() => import('./pages/Account'));
const Admin = lazy(() => import('./pages/admin/Admin'));
const BattleLobby = lazy(() => import('./pages/BattleLobby'));
const Gauntlet = lazy(() => import('./pages/Gauntlet'));
const Diagnostic = lazy(() => import('./pages/Diagnostic'));

// The app shell as a layout route: the navigation stays on screen while a page
// chunk loads, and only the page area shows the loading state.
function AppShell() {
  return (
    <MainLayout>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </MainLayout>
  );
}

const page = (name, element) => <ErrorBoundary name={name}>{element}</ErrorBoundary>;

// Replace only this component inside src/App.jsx
const SecureAppTerminal = () => {
  const { currentUser } = useAuth();

  // App-lifetime telemetry guardian: 15s safety-net flush, reconnect flush,
  // and a last-gasp keepalive flush when the tab hides/closes.
  useSyncLifecycle();

  useEffect(() => {
    // The previous Firestore listener and TOS initialization have been removed.
    // User state is now securely handled by Zustand local storage caching
    // and will be synced via the backend PostgreSQL API.
  }, []);

  if (!currentUser) return <Login />;

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: 'var(--bg-surface2)', color: 'var(--text-main)', border: '1px solid var(--border-light)' } }} />
      <NotificationOptIn />

      {/* Neutral fallback for all routes; the dashboard nests its own
          skeleton so only "/" shows the dashboard-shaped placeholder. */}
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* The five destinations (layouts/navModel.js), Account and Admin. */}
          <Route element={<AppShell />}>
            <Route index element={page('Today', <Suspense fallback={<TodaySkeleton />}><Today /></Suspense>)} />
            <Route path="practice" element={page('Practice', <Practice />)} />
            <Route path="exams" element={page('Exams', <Exams />)} />
            <Route path="progress" element={page('Progress', <Progress />)} />
            <Route path="library" element={page('Library', <Library />)} />
            <Route path="account" element={page('Account', <Account />)} />
            <Route path="admin" element={page('Admin', <AdminRoute><Admin /></AdminRoute>)} />
            <Route path="battle/:battleId" element={page('Battle', <BattleLobby />)} />
          </Route>

          {/* Old URLs. They forward router state, so a session preset sent to
              /review still starts (routes/LegacyRedirect.jsx). /review must
              stay: reminders already scheduled on phones open it. */}
          <Route path="/review" element={<LegacyRedirect to="/practice" />} />
          <Route path="/arena" element={<LegacyRedirect to="/exams?tab=battles" />} />
          <Route path="/profile" element={<LegacyRedirect to="/account" />} />
          <Route path="/materials" element={<LegacyRedirect to={(loc) => materialsTarget(loc.state)} />} />

          {/* No layout wrapper here — both pages own their layout choice
              internally now, since Board Simulator needs to switch between
              MainLayout (setup) and ExamLayout (active exam), which a static
              route-level wrapper can't express. Was previously double-
              wrapping Gauntlet (it renders its own ExamLayout) and forcing
              the "distraction-free exam" banner onto Simulator's setup
              screen before any exam had started. */}
          <Route path="/simulator" element={<ErrorBoundary name="Simulator"><BoardSimulator /></ErrorBoundary>} />
          <Route path="/gauntlet/:level" element={<ErrorBoundary name="Gauntlet"><Gauntlet /></ErrorBoundary>} />
          {/* Placement test — owns its layout like the Simulator: MainLayout
              for the intro and result, ExamLayout while answering. */}
          <Route path="/diagnostic" element={<ErrorBoundary name="Placement test"><Diagnostic /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SecureAppTerminal />
      </AuthProvider>
    </ErrorBoundary>
  );
}