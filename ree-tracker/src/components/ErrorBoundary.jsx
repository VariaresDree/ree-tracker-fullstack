// src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary:', error, errorInfo);
    // Optionally log to an analytics service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4">
          <div className="p-8 bg-surface border border-reeRed/40 rounded-2xl text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-black text-reeRed mb-2">Critical System Error</h2>
            <p className="text-sm text-muted2 mb-4">The application encountered an unrecoverable error.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-reeBlue hover:bg-reeBlue2 text-white rounded-lg text-sm font-bold"
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