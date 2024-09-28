import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Components/Auth";
import Home from "./Components/Home";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <div className="bg-gradient-to-bl from-slate-950 via-slate-700 to-slate-800 w-fill h-screen text-slate-200 p-10 mx-auto">
      {!session ? <Login /> : <Home />}
    </div>
  );
}

export default App;
