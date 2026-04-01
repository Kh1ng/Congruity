import { createClient } from "@supabase/supabase-js";
import { ConfigManager } from "./serverConfig";
import { appError } from "./logger";

// Supabase client instance
let supabaseInstance = null;

/**
 * Initialize Supabase with runtime configuration
 * @param {Object} config - Optional server configuration
 * @returns {Object} Supabase client instance
 */
export function initializeSupabase(config = null) {
  const activeConfig = config || ConfigManager.getActiveConfig();
  
  // If we have a runtime config, use it
  if (activeConfig) {
    supabaseInstance = createClient(
      activeConfig.supabaseUrl,
      activeConfig.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
    return supabaseInstance;
  }

  // Fall back to environment variables (backward compatibility)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = 
    import.meta.env.VITE_SUPABASE_ANON_KEY || 
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
    "";

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return null if no configuration available
    // ConfigWizard will handle this case
    return null;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
}

/**
 * Get the Supabase client instance
 * @returns {Object} Supabase client instance
 */
export function getSupabase() {
  if (!supabaseInstance) {
    return initializeSupabase();
  }
  return supabaseInstance;
}

/**
 * Legacy export for backward compatibility
 * Uses Proxy to lazily initialize Supabase when accessed
 */
export const supabase = new Proxy({}, {
  get(target, prop) {
    const instance = getSupabase();
    
    // If no instance available, return a safe placeholder
    if (!instance) {
      // Return empty object for most properties
      // This prevents errors during ConfigWizard setup
      if (prop === 'auth') {
        return {
          getUser: async () => ({ data: { user: null }, error: null }),
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        };
      }
      return undefined;
    }
    
    const value = instance[prop];
    
    // If it's a function, bind it to the instance
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    
    return value;
  }
});

/**
 * Get the current authenticated user's ID
 * @returns {Promise<string|null>} User ID or null if not authenticated
 */
export const getCurrentUserId = async () => {
  const client = getSupabase();
  if (!client) return null;
  
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    appError("Error getting user:", error);
    return null;
  }

  return user?.id ?? null;
};

/**
 * Get the current session's access token
 * @returns {Promise<string|null>} Access token or null if no session
 */
export const getAccessToken = async () => {
  const client = getSupabase();
  if (!client) return null;
  
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) {
    appError("Error getting session:", error);
    return null;
  }

  return session?.access_token ?? null;
};
