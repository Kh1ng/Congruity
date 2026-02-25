const DIRECT_SERVER_STORAGE_KEY = "congruity_direct_servers";

function safeUrlParse(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isDirectServerId(serverId) {
  return typeof serverId === "string" && serverId.startsWith("direct:");
}

export function isDirectServer(server) {
  return Boolean(server && typeof server === "object" && server.isDirect === true);
}

export function toSocketUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const parsed = safeUrlParse(raw);
  if (!parsed) return null;

  if (parsed.protocol === "ws:" || parsed.protocol === "wss:") {
    return parsed.toString().replace(/\/$/, "");
  }

  if (parsed.protocol === "http:") {
    parsed.protocol = "ws:";
    return parsed.toString().replace(/\/$/, "");
  }

  if (parsed.protocol === "https:") {
    parsed.protocol = "wss:";
    return parsed.toString().replace(/\/$/, "");
  }

  return null;
}

export function buildDirectServer({ signalingUrl, name }) {
  const normalizedSignalingUrl = toSocketUrl(signalingUrl);
  if (!normalizedSignalingUrl) {
    throw new Error("Invalid direct connect URL");
  }

  const parsed = new URL(normalizedSignalingUrl);
  const hostLabel = parsed.hostname === "127.0.0.1" ? "localhost" : parsed.hostname;
  const portLabel = parsed.port ? `:${parsed.port}` : "";
  const displayName = (name || "").trim() || `Direct (${hostLabel}${portLabel})`;
  const id = `direct:${normalizedSignalingUrl}`;

  return {
    id,
    name: displayName,
    description: "Direct self-host connection",
    isDirect: true,
    directConfig: {
      signaling_url: normalizedSignalingUrl,
      channels: [
        {
          id: `${id}:voice`,
          server_id: id,
          name: "voice-lounge",
          type: "voice",
          position: 1,
        },
      ],
    },
  };
}

export function parseDirectConnectInput(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  if (/^(wss?|https?):\/\//i.test(raw)) {
    return buildDirectServer({ signalingUrl: raw });
  }

  if (/^congruity:\/\/join\?/i.test(raw)) {
    const parsed = safeUrlParse(raw);
    if (!parsed) return null;
    const signal = parsed.searchParams.get("signal") || parsed.searchParams.get("signaling");
    const name = parsed.searchParams.get("name") || parsed.searchParams.get("server");
    if (!signal) {
      throw new Error("Direct join link is missing a signaling URL");
    }
    return buildDirectServer({ signalingUrl: signal, name });
  }

  return null;
}

export function loadDirectServers() {
  if (
    typeof window === "undefined" ||
    typeof localStorage === "undefined" ||
    typeof localStorage.getItem !== "function"
  ) {
    return [];
  }
  try {
    const raw = localStorage.getItem(DIRECT_SERVER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDirectServer);
  } catch {
    return [];
  }
}

export function saveDirectServers(servers) {
  if (
    typeof window === "undefined" ||
    typeof localStorage === "undefined" ||
    typeof localStorage.setItem !== "function"
  ) {
    return;
  }
  const safeList = Array.isArray(servers) ? servers.filter(isDirectServer) : [];
  localStorage.setItem(DIRECT_SERVER_STORAGE_KEY, JSON.stringify(safeList));
}

export default {
  isDirectServerId,
  isDirectServer,
  toSocketUrl,
  buildDirectServer,
  parseDirectConnectInput,
  loadDirectServers,
  saveDirectServers,
};
