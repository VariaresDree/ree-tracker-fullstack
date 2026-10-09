import React from 'react';
import { Button, Card, EmptyState } from './ui';
import { TriangleAlert } from './ui/icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary] ${this.props.name || 'App'} crashed:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.name) {
        // Cap retries: if the child throws deterministically, "Retry" just
        // resets hasError and re-throws immediately (a flicker loop). After a
        // couple of attempts, offer a full reload instead.
        const exhausted = this.state.retryCount >= 2;
        return (
          <Card role="alert" aria-live="assertive" style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, transparent)' }}>
            <EmptyState
              compact
              icon={TriangleAlert}
              title={`${this.props.name} couldn’t load`}
              description="Something went wrong while showing this part of the page. The rest of the app still works."
              action={exhausted ? (
                <Button variant="secondary" onClick={() => window.location.reload()}>Reload page</Button>
              ) : (
                <Button variant="secondary" onClick={() => this.setState((st) => ({ hasError: false, error: null, retryCount: st.retryCount + 1 }))}>Try again</Button>
              )}
            />
            {this.state.error?.message && (
              <details className="px-5 pb-4 text-xs text-muted2 text-center">
                <summary className="cursor-pointer">Details</summary>
                <p className="mt-1 break-words">{this.state.error.message}</p>
              </details>
            )}
          </Card>
        );
      }

      return (
        <div role="alert" aria-live="assertive" className="min-h-screen flex items-center justify-center bg-bg p-4">
          <Card className="max-w-md w-full">
            <EmptyState
              titleAs="h1"
              icon={TriangleAlert}
              title="Something went wrong"
              description="REE.ai hit an error it can’t recover from on this page. Reloading usually fixes it; answers you’ve saved stay on this device."
              action={<Button onClick={() => window.location.reload()}>Reload</Button>}
            />
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;