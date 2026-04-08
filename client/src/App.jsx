import React, { useState, useEffect, useCallback } from "react";
import Login from "./Components/Login";
import Home from "./Components/Home";
import { ConfigWizard } from "./Components/ConfigWizard";
import { useAuth } from "./hooks/useAuth";
import { useServers } from "./hooks/useServers";
import { ConfigManager } from "./lib/serverConfig";

function App() {
  const { user, loading, authError, retrySession, signOut } = useAuth();
  const { joinServer } = useServers();
  const [needsConfig, setNeedsConfig] = useState(true);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [forceConfig, setForceConfig] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  // Invite code to auto-join once the user is logged in
  const [pendingInviteCode, setPendingInviteCode] = useState(null);
  const [inviteJoinState, setInviteJoinState] = useState(null); // null | "joining" | "done" | Error

  useEffect(() => {
    // Check for invite params even before config — user may have a config already
    const parsed = ConfigManager.parseInviteUrl();
    if (parsed && !ConfigManager.needsConfiguration()) {
      // Config already set (same server or manually configured): just store invite
      setPendingInviteCode(parsed.inviteCode);
      ConfigManager.clearInviteParams();
    }

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

  // Once user is logged in and there's a pending invite, auto-join
  useEffect(() => {
    if (!user || !pendingInviteCode || inviteJoinState) return;
    setInviteJoinState("joining");
    joinServer(pendingInviteCode)
      .then(() => {
        setInviteJoinState("done");
        setPendingInviteCode(null);
      })
      .catch((err) => {
        // "Already a member" is fine — treat as success
        if (err?.message?.toLowerCase().includes("already")) {
          setInviteJoinState("done");
          setPendingInviteCode(null);
        } else {
          setInviteJoinState(err);
        }
      });
  }, [user, pendingInviteCode, inviteJoinState, joinServer]);

  const handleWizardComplete = useCallback((inviteCode) => {
    if (inviteCode) setPendingInviteCode(inviteCode);
    setNeedsConfig(false);
    setForceConfig(false);
    retrySession();
  }, [retrySession]);

  // Show config wizard if needed
  if (checkingConfig) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (needsConfig || forceConfig) {
    return <ConfigWizard onComplete={handleWizardComplete} />;
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
      {inviteJoinState === "joining" && (
        <div className="mb-3 shrink-0 rounded border border-theme bg-theme-surface-alt px-3 py-2 text-xs text-theme-muted">
          Joining server…
        </div>
      )}
      {inviteJoinState instanceof Error && (
        <div className="mb-3 shrink-0 rounded border border-red-700 bg-red-900/20 px-3 py-2 text-xs text-red-400">
          Could not join server: {inviteJoinState.message}
          <button
            type="button"
            className="ml-3 underline hover:text-red-300"
            onClick={() => setInviteJoinState(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <Home />
      </div>
    </div>
  );
}

export default App;
