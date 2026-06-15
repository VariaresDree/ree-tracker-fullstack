// src/App.jsx
import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { db } from './config/firebaseDb';
import { doc, onSnapshot } from 'firebase/firestore';
import { useStore } from './store/useStore';
import { Toaster } from 'react-hot-toast';

import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './layouts/MainLayout';
import ExamLayout from './layouts/ExamLayout';
import Login from './pages/Login'; 

// Lazy Loaded Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ActiveReview = lazy(() => import('./pages/ActiveReview'));
const BoardSimulator = lazy(() => import('./pages/BoardSimulator'));
const Library = lazy(() => import('./pages/Library'));
const Materials = lazy(() => import('./pages/Materials'));
const Profile = lazy(() => import('./pages/Profile'));
const Arena = lazy(() => import('./pages/Arena'));
const BattleLobby = lazy(() => import('./pages/BattleLobby'));
const Gauntlet = lazy(() => import('./pages/Gauntlet')); // Added lazy load

const defaultStats = {
  examDate: '2026-08-15',
  dailyTarget: 50,
  dailyMath: 0,
  dailyESAS: 0,
  dailyEE: 0,
  matrix: { hc: 0, hw: 0, lc: 0, lw: 0 },
  microTopics: {},
  blindSpots: [],
  thetaHistory: [],
  irt: { theta: 0.0, consecutiveCorrect: 0, consecutiveWrong: 0 },
  globalStreak: 0,
  lastActiveDate: null,
};

const SecureAppTerminal = () => {
  const { currentUser } = useAuth();
  const setStats = useStore((state) => state.setStats);
  const initializeTOS = useStore((state) => state.initializeTOS);

  useEffect(() => {
    // Boot the dynamic TOS engine globally on load
    initializeTOS();

    if (!currentUser?.uid) return;
    const docRef = doc(db, 'userData', currentUser.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        const localStats = useStore.getState().stats;

        // CRITICAL CHECK: Ignore stale cloud snapshot to protect local matrix.
        if (!localStats?.localTimestamp || !cloudData.cloudTimestamp || cloudData.cloudTimestamp > localStats.localTimestamp) {
            setStats({ ...defaultStats, ...cloudData });
        }
      } else {
        setStats(defaultStats);
      }
    });
    return () => unsubscribe();
  }, [currentUser, setStats, initializeTOS]);

  if (!currentUser) return <Login />;

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: '#1a2235', color: '#f1f5f9' } }} />
      
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-bg text-muted2">
          <span className="telemetry-spinner mr-2"></span> Loading module...
        </div>
      }>
        <Routes>
          <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
          <Route path="/review" element={<MainLayout><ActiveReview /></MainLayout>} />
          <Route path="/library" element={<MainLayout><Library /></MainLayout>} />
          <Route path="/materials" element={<MainLayout><Materials /></MainLayout>} />
          <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
          <Route path="/arena" element={<MainLayout><Arena /></MainLayout>} />
          <Route path="/battle/:battleId" element={<MainLayout><BattleLobby /></MainLayout>} />
          <Route path="/simulator" element={<ExamLayout><BoardSimulator /></ExamLayout>} />
          <Route path="/gauntlet/:level" element={<ExamLayout><Gauntlet /></ExamLayout>} />
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