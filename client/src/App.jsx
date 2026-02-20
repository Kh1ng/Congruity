import React from "react";
import Login from "./Components/Login";
import Home from "./Components/Home";
import { useAuth } from "./hooks/useAuth";

function App() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-slate-200">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="flex flex-col items-center justify-center pt-20">
          <h1 className="text-center p-5 m-5 text-gruvbox-orange text-3xl font-bold">
            Sign in to Congruity
          </h1>
          <Login />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg)] h-screen text-[var(--color-text)] px-6 py-6 flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <span className="text-sm text-slate-400">
          Logged in as {user.email}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="text-sm text-slate-400 hover:text-gruvbox-orange"
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
