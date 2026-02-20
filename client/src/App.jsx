import React from "react";
import Login from "./Components/Login";
import Home from "./Components/Home";
import { useAuth } from "./hooks/useAuth";

function App() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-theme-bg text-theme">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-theme-bg text-theme">
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
    <div className="flex h-screen flex-col bg-theme-bg px-6 py-6 text-theme">
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
