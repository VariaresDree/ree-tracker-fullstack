// src/App.jsx
import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
const Gauntlet = lazy(() => import('./pages/Gauntlet')); 

// Replace only this component inside src/App.jsx
const SecureAppTerminal = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    // The previous Firestore listener and TOS initialization have been removed.
    // User state is now securely handled by Zustand local storage caching
    // and will be synced via the backend PostgreSQL API.
  }, []);

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
          <Route path="/" element={<MainLayout><ErrorBoundary name="Dashboard"><Dashboard /></ErrorBoundary></MainLayout>} />
          <Route path="/review" element={<MainLayout><ErrorBoundary name="Active Review"><ActiveReview /></ErrorBoundary></MainLayout>} />
          <Route path="/library" element={<MainLayout><ErrorBoundary name="Library"><Library /></ErrorBoundary></MainLayout>} />
          <Route path="/materials" element={<MainLayout><ErrorBoundary name="Materials"><Materials /></ErrorBoundary></MainLayout>} />
          <Route path="/profile" element={<MainLayout><ErrorBoundary name="Profile"><Profile /></ErrorBoundary></MainLayout>} />
          <Route path="/arena" element={<MainLayout><ErrorBoundary name="Arena"><Arena /></ErrorBoundary></MainLayout>} />
          <Route path="/battle/:battleId" element={<MainLayout><ErrorBoundary name="Battle"><BattleLobby /></ErrorBoundary></MainLayout>} />
          <Route path="/simulator" element={<ExamLayout><ErrorBoundary name="Simulator"><BoardSimulator /></ErrorBoundary></ExamLayout>} />
          <Route path="/gauntlet/:level" element={<ExamLayout><ErrorBoundary name="Gauntlet"><Gauntlet /></ErrorBoundary></ExamLayout>} />
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