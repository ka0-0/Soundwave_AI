import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[CRITICAL RENDERING ERROR]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0c] p-6 text-center text-white">
          <div className="mb-6 rounded-full bg-red-500/10 p-4 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">System Malfunction</h1>
          <p className="mt-2 text-muted max-w-md">
            The neural interface encountered a critical rendering exception. This might be due to a connection error or a missing module.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Reboot Interface
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="rounded-lg bg-pink/10 px-4 py-2 text-sm font-medium text-pink hover:bg-pink/20 transition-colors"
            >
              Clear Cache & Reset
            </button>
          </div>
          {import.meta.env.DEV && (
            <div className="mt-10 max-w-2xl overflow-auto rounded-lg bg-black/40 p-4 text-left font-mono text-xs text-red-400">
              <p className="font-bold">{this.state.error?.toString()}</p>
              <pre className="mt-2 opacity-60">{this.state.error?.stack}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
