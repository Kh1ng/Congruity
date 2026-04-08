/**
 * Runtime server configuration manager.
 *
 * Stores the user's Supabase URL + anon key in localStorage so the app can be
 * pointed at any self-hosted Supabase instance without a rebuild.
 *
 * Falls back gracefully to Vite env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 * when no runtime config has been saved — this covers cloud deployments where the
 * credentials are baked in at build time.
 */

const CONFIG_KEY = "congruity_server_config";

function safeGet(key) {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch {
    // ignore (e.g. private browsing quota)
  }
}

function safeRemove(key) {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const ConfigManager = {
  /**
   * Returns true if no runtime config exists AND no env vars are present.
   * The ConfigWizard is shown when this is true.
   */
  needsConfiguration() {
    const stored = safeGet(CONFIG_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.supabaseUrl && parsed?.supabaseAnonKey) return false;
      } catch {
        // corrupt entry — treat as missing
      }
    }

    // Env-var path (build-time config)
    const envUrl = typeof import.meta !== "undefined"
      ? import.meta.env?.VITE_SUPABASE_URL
      : undefined;
    if (envUrl) return false;

    return true;
  },

  /**
   * Returns the active server config or null.
   * null means supabase.js should fall back to env vars.
   */
  getActiveConfig() {
    const stored = safeGet(CONFIG_KEY);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.supabaseUrl && parsed?.supabaseAnonKey) return parsed;
    } catch {
      // corrupt — ignore
    }
    return null;
  },

  /**
   * Persist a server config (called from ConfigWizard on completion).
   * @param {{ supabaseUrl: string, supabaseAnonKey: string, signalingUrl?: string }} config
   */
  saveConfig(config) {
    safeSet(CONFIG_KEY, JSON.stringify(config));
  },

  /** Clear saved config (used when switching servers). */
  clearConfig() {
    safeRemove(CONFIG_KEY);
  },
};

export default ConfigManager;
