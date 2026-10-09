import React from 'react';

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
          <div role="alert" aria-live="assertive" className="p-6 bg-surface border border-reeRed/30 rounded-xl text-center">
            <div className="text-sm font-bold text-reeRed-text mb-1">
              {this.props.name} couldn’t load
            </div>
            <div className="text-xs text-muted2 mb-3">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </div>
            {exhausted ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="touch-target px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold transition-colors cursor-pointer border border-border2"
              >
                Reload page
              </button>
            ) : (
              <button
                type="button"
                onClick={() => this.setState((s) => ({ hasError: false, error: null, retryCount: s.retryCount + 1 }))}
                className="touch-target px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold transition-colors cursor-pointer border border-border2"
              >
                Try again
              </button>
            )}
          </div>
        );
      }

      return (
        <div role="alert" aria-live="assertive" className="min-h-screen flex items-center justify-center bg-bg p-4">
          <div className="p-8 bg-surface border border-reeRed/40 rounded-2xl text-center max-w-md">
            <h1 className="text-xl font-bold text-textMain mb-2">Something went wrong</h1>
            <p className="text-sm text-muted2 mb-4">REE.ai hit an error it can’t recover from on this page. Reloading usually fixes it; answers you’ve saved stay on this device.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="touch-target px-6 py-2 bg-reeBlue hover:bg-reeBlue2 text-white rounded-lg text-sm font-bold cursor-pointer"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;