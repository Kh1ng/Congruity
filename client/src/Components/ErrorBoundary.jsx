import React from "react";

function isAbortLikeError(error) {
  const message = String(error?.message || error || "");
  return (
    error?.name === "AbortError" ||
    message.includes("AbortError") ||
    message.includes("operation was aborted") ||
    message.includes("Request was aborted")
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  componentDidMount() {
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Keep logging for alpha diagnostics in dev tools.
    console.error("Application error boundary caught an error", error, errorInfo);
  }

  handleWindowError = (event) => {
    if (isAbortLikeError(event?.error || event?.message)) {
      return;
    }
    this.setState({
      hasError: true,
      error: event.error || new Error(event.message || "Unexpected runtime error"),
    });
  };

  handleUnhandledRejection = (event) => {
    const reason = event.reason;
    if (isAbortLikeError(reason)) {
      event.preventDefault?.();
      return;
    }
    const error = reason instanceof Error ? reason : new Error(String(reason));
    this.setState({
      hasError: true,
      error,
    });
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg p-6">
        <div className="w-full max-w-xl rounded-xl border border-theme bg-theme-surface p-6">
          <h1 className="text-xl font-semibold text-theme">Something went wrong</h1>
          <p className="mt-2 text-sm text-theme-muted">
            Congruity hit an unexpected error. You can retry without restarting.
          </p>
          {this.state.error?.message && (
            <pre className="mt-4 rounded border border-theme bg-theme-surface-alt p-3 text-xs text-theme-muted overflow-auto">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded border border-theme bg-theme-surface-alt px-3 py-1.5 text-sm text-theme transition hover:text-theme-accent"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded border border-theme bg-theme-surface px-3 py-1.5 text-sm text-theme transition hover:text-theme-accent"
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
