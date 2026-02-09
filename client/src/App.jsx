import React, { useEffect, useState } from "react";
import Login from "./Components/Login";
import Home from "./Components/Home";
import { useAuth } from "./Components/AuthContext";

function App() {
  const { userId, login } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const token = localStorage.getItem("authToken");
      console.log("Token being sent:", token); // Log the token
      if (!token) {
        console.error("No authToken found in localStorage");
        setLoading(false);
        return; // Exit if no token
      }
      try {
        const response = await fetch("api/session", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          login(data.userId); // Update userId in AuthContext
        } else {
          console.error("Session fetch failed:", response.status);
        }
      } catch (error) {
        console.error("Failed to fetch session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [login]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userId) {
    return (
      <div className=" items-center justify-center">
        <h1 className="text-center justify-center p-5 m-5 text-gruvbox-orange text-3xl font-bold">
          Sign in to Congruity
        </h1>
        <Login />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-bl from-slate-950 via-slate-700 to-slate-800 w-fill h-screen text-slate-200 p-10 mx-auto">
      <Home />
    </div>
  );
}

export default App;
