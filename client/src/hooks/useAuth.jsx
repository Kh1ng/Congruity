import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext(null);

/**
 * Auth state and methods provided by useAuth
 * @typedef {Object} AuthState
 * @property {Object|null} user - Current user object
 * @property {Object|null} session - Current session object
 * @property {boolean} loading - Whether auth state is loading
 * @property {Function} signUp - Sign up with email/password
 * @property {Function} signIn - Sign in with email/password
 * @property {Function} signOut - Sign out current user
 */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const refreshSession = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
      setAuthError(null);
    } catch (error) {
      setSession(null);
      setUser(null);
      setAuthError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthError(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [refreshSession]);

  const signUp = useCallback(async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;
    return data;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = {
    user,
    session,
    loading,
    authError,
    signUp,
    signIn,
    signOut,
    retrySession: refreshSession,
    clearAuthError: () => setAuthError(null),
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth state and methods
 * @returns {AuthState}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default useAuth;
