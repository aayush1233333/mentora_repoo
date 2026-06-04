import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // In production, send to error tracking (Sentry etc.)
    console.error("[Mentora ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-900/30 border border-red-700 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Mentora encountered an unexpected error. Your session data is safe.
          </p>
          {this.state.error && (
            <pre className="text-left text-xs text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6 overflow-auto max-h-32">
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, info: null });
              window.location.href = "/dashboard";
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold mx-auto transition-colors"
          >
            <RefreshCw size={16} />
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
}
