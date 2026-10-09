// src/components/StatsUnavailable.jsx
//
// Today and Progress when this account's stats have never loaded on this
// device and the fetch failed (usually a first visit offline). Both pages
// used to show their loading skeleton forever.
import { Button, Card, EmptyState } from './ui';
import { CloudOff, TriangleAlert } from './ui/icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function StatsUnavailable({ onRetry }) {
  const isOnline = useNetworkStatus();
  return (
    <Card>
      <EmptyState
        icon={isOnline ? TriangleAlert : CloudOff}
        title={isOnline ? "Couldn't load your progress" : 'Your progress needs a connection'}
        description={isOnline
          ? 'Something went wrong on our side or the connection dropped. Try again in a moment.'
          : 'It loads from your account the first time. After that, this device keeps a copy you can see offline.'}
        action={<Button onClick={onRetry}>Try again</Button>}
      />
    </Card>
  );
}
