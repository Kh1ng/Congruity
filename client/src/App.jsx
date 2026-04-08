import React, { useState, useEffect } from "react";
import Login from "./Components/Login";
import Home from "./Components/Home";
import { ConfigWizard } from "./Components/ConfigWizard";
import { useAuth } from "./hooks/useAuth";
import { ConfigManager } from "./lib/serverConfig";

function App() {
  const { user, loading, authError, retrySession, signOut } = useAuth();
  const [needsConfig, setNeedsConfig] = useState(true);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [forceConfig, setForceConfig] = useState(false);
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    // Check if configuration is needed
    try {
      const configNeeded = ConfigManager.needsConfiguration();
      setNeedsConfig(configNeeded);
      setCheckingConfig(false);
    } catch (error) {
      console.error('Error checking configuration:', error);
      setNeedsConfig(true);
      setCheckingConfig(false);
    }
  }, []);

  // Show config wizard if needed
  if (checkingConfig) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (needsConfig || forceConfig) {
    return (
      <ConfigWizard
        onComplete={() => {
          setNeedsConfig(false);
          setForceConfig(false);
          retrySession();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-theme-bg text-theme">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user && guestMode) {
    return (
      <div className="flex h-screen flex-col ui-app-bg px-4 py-4 text-theme sm:px-6 sm:py-6">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <span className="text-sm text-theme-muted">Guest mode (not signed in)</span>
          <button
            type="button"
            onClick={() => setGuestMode(false)}
            className="text-sm text-theme-muted transition hover:text-theme-accent"
          >
            Sign in
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <Home />
        </div>
      </div>
    );
  }

  if (!user) {
    if (authError && !guestMode) {
      const authMessage = authError?.message || "";
      return (
        <div className="min-h-screen ui-app-bg text-theme flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-xl border border-theme bg-theme-surface p-6">
            <h1 className="text-2xl font-semibold text-theme">Connection unavailable</h1>
            <p className="mt-2 text-sm text-theme-muted">
              Congruity could not reach your auth backend. This is usually a Supabase URL, DNS,
              or CORS issue for the configured server.
            </p>
            {authMessage && (
              <pre className="mt-4 rounded border border-theme bg-theme-surface-alt p-3 text-xs text-theme-muted overflow-auto">
                {authMessage}
              </pre>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={retrySession}
                className="rounded border border-theme bg-theme-surface-alt px-3 py-1.5 text-sm text-theme transition hover:text-theme-accent"
              >
                Retry connection
              </button>
              <button
                type="button"
                onClick={() => setForceConfig(true)}
                className="rounded border border-theme bg-theme-surface px-3 py-1.5 text-sm text-theme transition hover:text-theme-accent"
              >
                Reconfigure server
              </button>
              <button
                type="button"
                onClick={() => setGuestMode(true)}
                className="rounded border border-theme bg-theme-surface px-3 py-1.5 text-sm text-theme transition hover:text-theme-accent"
              >
                Continue in guest mode
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen ui-app-bg text-theme">
        <div className="flex flex-col items-center justify-center pt-20">
          <h1 className="m-5 p-5 text-center text-3xl font-bold text-theme-accent">
            Sign in to Congruity
          </h1>
          <Login />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col ui-app-bg px-4 py-4 text-theme sm:px-6 sm:py-6">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <span className="text-sm text-theme-muted">
          Logged in as {user.email}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="text-sm text-theme-muted transition hover:text-theme-accent"
        >
          Sign Out
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <Home />
      </div>
    </div>
  );
}

export default App;
