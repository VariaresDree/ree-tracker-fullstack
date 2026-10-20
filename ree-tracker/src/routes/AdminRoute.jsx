// src/routes/AdminRoute.jsx
//
// The client-side gate for the Admin area. The role arrives with the profile
// request — seconds after sign-in on a cold backend — so this waits for it
// (roleResolved) instead of bouncing a real admin who opened /admin directly.
// Offline, the role can't be checked, so nobody is bounced either. A learner
// is sent home. The server is still the real gate: every admin endpoint checks
// the role itself.
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { EmptyState, Page, Skeleton } from '../components/ui';
import { WifiOff } from '../components/ui/icons';

export default function AdminRoute({ children }) {
  const { isAdmin, roleResolved } = useAuth();
  const isOnline = useNetworkStatus();

  if (isAdmin) return children;

  if (!roleResolved) {
    return (
      <Page>
        <p role="status" className="text-sm text-muted2">Checking access…</p>
        <Skeleton className="h-40" />
      </Page>
    );
  }

  if (!isOnline) {
    return (
      <EmptyState
        icon={WifiOff}
        title="Admin tools need a connection"
        description="Your access can't be checked offline. Reconnect and try again."
      />
    );
  }

  return <Navigate to="/" replace />;
}
