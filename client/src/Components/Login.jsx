import React, { useState } from "react";
import { useAuth } from "./AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        const data = await response.json();
        login(data);
      } else {
        const errorData = await response.json();
        setError("An error occured. ", errorData.message);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 m-5">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="border p-2 rounded m-1 font-thin text-gruvbox-fgLight"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        className="border p-2 rounded m-1 font-thin text-gruvbox-fgLight"
      />
      <button
        className="align-center text-center text-gruvbox-fgLight hover:bg-gruvbox-orange hover:text-gruvbox-dark p-2 text-xl m-1"
        type="submit"
        disabled={loading}
      >
        {loading ? "Loading..." : "Login"}
      </button>
      {error && <div>{error}</div>}
    </form>
  );
}

export default Login;
