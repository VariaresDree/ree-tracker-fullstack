// src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from './contexts/AuthContext';
import { useSyncLifecycle } from './hooks/useSyncLifecycle';
import { Toaster } from 'react-hot-toast';

import ErrorBoundary from './components/ErrorBoundary';
import RouteFallback from './components/RouteFallback';
import { TodaySkeleton } from './components/SkeletonLoaders';
import MainLayout from './layouts/MainLayout';
import NotificationOptIn from './components/NotificationOptIn';
import useMediaQuery from './hooks/useMediaQuery';
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
const SittingReview = lazy(() => import('./pages/SittingReview'));
const QuizRunPage = lazy(() => import('./features/quiz-launcher/QuizRunPage'));
// The full-screen focus timer: outside the app shell, and lazy (only the
// sidebar's small launcher is in the first download).
const Focus = lazy(() => import('./pages/Focus'));
// A printed paper set's print preview: full screen, outside the shell, lazy
// with its own stylesheet (the sheets, and what printing shows).
const PrintSet = lazy(() => import('./pages/PrintSet'));
// The weak-formula sheet (CELE round): the same kind of full-screen print page.
const PrintFormulas = lazy(() => import('./pages/PrintFormulas'));
// The answer-sheet scanner: full screen, outside the shell, lazy with its own
// stylesheet (the camera, the review and the score). A set's results page
// sits inside the shell (Exams > Paper sets > Results).
const ScanSheet = lazy(() => import('./pages/ScanSheet'));
const PaperSetResults = lazy(() => import('./pages/PaperSetResults'));

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

  // One toast host for both branches. It used to mount only inside the signed-in
  // app, so the login screen's messages ("a reset link is on its way") never
  // showed, and queued ones popped up after signing in.
  // Toasts sit below the phone header (they covered it), centred on a phone.
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const toaster = (
    <Toaster
      position={isDesktop ? 'top-right' : 'top-center'}
      containerStyle={{ top: 'calc(var(--phone-header-h, 0.5rem) + 0.5rem)' }}
      toastOptions={{ duration: 3000, style: { background: 'var(--bg-surface2)', color: 'var(--text-main)', border: '1px solid var(--border-light)' } }}
    />
  );

  if (!currentUser) return <>{toaster}<Login /></>;

  return (
    <Router>
      {toaster}
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
            {/* A finished sitting, item by item (Exams › Past sittings › Review). */}
            <Route path="exams/sittings/:sessionId" element={page('Sitting review', <SittingReview />)} />
            {/* A printed set's scanned sheets: scores, item analysis, CSV. */}
            <Route path="exams/paper-sets/:setId" element={page('Paper set results', <PaperSetResults />)} />
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
          {/* The focus timer, full screen: no navigation, the theme's
              background, and the timer's own clock (pages/Focus.jsx). */}
          <Route path="/focus" element={<ErrorBoundary name="Focus timer"><Focus /></ErrorBoundary>} />
          {/* A printed set's pages, to edit and print (pages/PrintSet.jsx). */}
          {/* The formula cards you still miss, to print (pages/PrintFormulas.jsx). */}
          <Route path="/print/formulas" element={<ErrorBoundary name="Weak formulas"><PrintFormulas /></ErrorBoundary>} />
          <Route path="/print/:setId" element={<ErrorBoundary name="Print preview"><PrintSet /></ErrorBoundary>} />
          {/* Photograph answer sheets and score them (pages/ScanSheet.jsx). */}
          <Route path="/scan" element={<ErrorBoundary name="Scanner"><ScanSheet /></ErrorBoundary>} />
          <Route path="/scan/:setId" element={<ErrorBoundary name="Scanner"><ScanSheet /></ErrorBoundary>} />
          <Route path="/gauntlet/:level" element={<ErrorBoundary name="Gauntlet"><Gauntlet /></ErrorBoundary>} />
          {/* Placement test — owns its layout like the Simulator: MainLayout
              for the intro and result, ExamLayout while answering. */}
          <Route path="/diagnostic" element={<ErrorBoundary name="Placement test"><Diagnostic /></ErrorBoundary>} />
          {/* An imported quiz being run — exam layout, outside the app shell. */}
          <Route path="/library/quiz" element={<ErrorBoundary name="Imported quiz"><QuizRunPage /></ErrorBoundary>} />
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