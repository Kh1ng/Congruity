import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, { username });
        // Supabase may require email confirmation depending on settings
        setError("Check your email to confirm your account!");
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <form onSubmit={handleSubmit} className="p-5 m-5 flex flex-col gap-2">
        {isSignUp && (
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            className="border p-2 rounded font-thin text-gruvbox-fgLight"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="border p-2 rounded font-thin text-gruvbox-fgLight"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit(e);
            }
          }}
          placeholder="Password"
          required
          minLength={6}
          className="border p-2 rounded font-thin text-gruvbox-fgLight"
        />
        <button
          className="text-center text-gruvbox-fgLight hover:bg-gruvbox-orange hover:text-gruvbox-dark p-2 text-xl rounded"
          type="submit"
          disabled={loading}
        >
          {loading ? "Loading..." : isSignUp ? "Sign Up" : "Login"}
        </button>
        {error && (
          <div className={error.includes("Check your email") ? "text-green-400" : "text-red-400"}>
            {error}
          </div>
        )}
      </form>

      <button
        type="button"
        onClick={() => {
          setIsSignUp(!isSignUp);
          setError(null);
        }}
        className="text-gruvbox-fgLight hover:text-gruvbox-orange underline"
      >
        {isSignUp ? "Already have an account? Login" : "Need an account? Sign Up"}
      </button>
    </div>
  );
}

export default Login;
