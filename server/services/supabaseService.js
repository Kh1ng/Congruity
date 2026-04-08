const SUPABASE_URL = process.env.SUPABASE_URL || process.env.API_EXTERNAL_URL || "";
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY || "";
const ANON_KEY = process.env.ANON_KEY || "";

function requireSupabaseConfig() {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL (or API_EXTERNAL_URL) is required.");
  }
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SERVICE_ROLE_KEY is required for backend voice permission checks.");
  }
}

function buildHeaders({ token, service = false } = {}) {
  const headers = {
    "Content-Type": "application/json",
    apikey: service ? SERVICE_ROLE_KEY : ANON_KEY || SERVICE_ROLE_KEY,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function authenticateToken(accessToken) {
  requireSupabaseConfig();
  if (!accessToken) return null;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: buildHeaders({ token: accessToken }),
  });

  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function querySingle(path) {
  requireSupabaseConfig();
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: "GET",
    headers: buildHeaders({ service: true }),
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  if (!Array.isArray(data)) return null;
  return data[0] || null;
}

async function getChannelById(channelId) {
  const encoded = encodeURIComponent(channelId);
  return querySingle(
    `/rest/v1/channels?select=id,server_id,name,type,federation_enabled&id=eq.${encoded}`
  );
}

async function getProfileByUserId(userId) {
  const encoded = encodeURIComponent(userId);
  return querySingle(
    `/rest/v1/profiles?select=id,username,display_name,avatar_url&id=eq.${encoded}`
  );
}

async function isServerMember(serverId, userId) {
  const serverIdEncoded = encodeURIComponent(serverId);
  const userIdEncoded = encodeURIComponent(userId);
  const member = await querySingle(
    `/rest/v1/server_members?select=user_id&server_id=eq.${serverIdEncoded}&user_id=eq.${userIdEncoded}`
  );
  return Boolean(member);
}

async function canAccessChannel({ userId, channelId, serverId }) {
  const channel = await getChannelById(channelId);
  if (!channel) return { allowed: false, channel: null };

  if (serverId && channel.server_id !== serverId) {
    return { allowed: false, channel };
  }

  const member = await isServerMember(channel.server_id, userId);
  return {
    allowed: member,
    channel,
  };
}

module.exports = {
  authenticateToken,
  canAccessChannel,
  getChannelById,
  getProfileByUserId,
};
