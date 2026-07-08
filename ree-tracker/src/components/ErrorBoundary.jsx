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
            <span className="text-2xl mb-2 block" aria-hidden="true">⚠️</span>
            <div className="text-sm font-bold text-reeRed mb-1">
              {this.props.name} encountered an error
            </div>
            <div className="text-xs text-muted2 mb-3">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </div>
            {exhausted ? (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold transition-colors cursor-pointer border border-border2"
              >
                Reload page
              </button>
            ) : (
              <button
                onClick={() => this.setState((s) => ({ hasError: false, error: null, retryCount: s.retryCount + 1 }))}
                className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold transition-colors cursor-pointer border border-border2"
              >
                Retry
              </button>
            )}
          </div>
        );
      }

      return (
        <div role="alert" aria-live="assertive" className="min-h-screen flex items-center justify-center bg-bg p-4">
          <div className="p-8 bg-surface border border-reeRed/40 rounded-2xl text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-black text-reeRed mb-2">Critical System Error</h2>
            <p className="text-sm text-muted2 mb-4">The application encountered an unrecoverable error.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-reeBlue hover:bg-reeBlue2 text-white rounded-lg text-sm font-bold cursor-pointer"
            >
              Reload Engine
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;