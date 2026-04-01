const crypto = require("crypto");

function getFederationSecret() {
  return process.env.FEDERATION_SHARED_SECRET || "";
}

function getServerDomain() {
  return process.env.SERVER_DOMAIN || process.env.SELFHOSTED_PUBLIC_HOST || "localhost";
}

function normalizeRemoteServer(remoteServer) {
  if (typeof remoteServer !== "string" || !remoteServer.trim()) {
    throw new Error("remoteServer is required.");
  }

  let candidate = remoteServer.trim();
  if (candidate.includes("://")) {
    const parsed = new URL(candidate);
    candidate = parsed.host;
  }

  if (candidate.includes("/") || candidate.includes("?") || candidate.includes("#")) {
    throw new Error("remoteServer must be a bare host or host:port.");
  }

  // Domain, IPv4, or localhost + optional port.
  if (!/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(candidate)) {
    throw new Error("remoteServer contains invalid characters.");
  }

  return candidate.toLowerCase();
}

function parseFederationAllowList() {
  return String(process.env.FEDERATION_ALLOWED_SERVERS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isFederationServerAllowed(remoteServer) {
  const normalized = normalizeRemoteServer(remoteServer);
  const allowList = parseFederationAllowList();

  if (allowList.length === 0) {
    return process.env.NODE_ENV !== "production";
  }

  return allowList.includes(normalized);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function signFederationPayload(payload) {
  const secret = getFederationSecret();
  if (!secret) {
    throw new Error("FEDERATION_SHARED_SECRET is not configured.");
  }
  return crypto
    .createHmac("sha256", secret)
    .update(stableStringify(payload))
    .digest("hex");
}

function verifyFederationSignature(payload, signature) {
  if (!signature) return false;
  const expected = signFederationPayload(payload);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(String(signature), "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

async function joinFederatedVoiceRoom({ remoteServer, channelId, localUser }) {
  const normalizedRemote = normalizeRemoteServer(remoteServer);
  const infoResponse = await fetch(
    `https://${normalizedRemote}/_congruity/federation/v1/info`
  );
  if (!infoResponse.ok) {
    throw new Error(`Remote federation info lookup failed (${infoResponse.status})`);
  }

  const serverDomain = getServerDomain();
  const payload = {
    room_id: `channel-${channelId}`,
    user_id: `${localUser.username}@${serverDomain}`,
    display_name: localUser.display_name || localUser.username,
    requesting_server: serverDomain,
    timestamp: Date.now(),
  };
  const signature = signFederationPayload(payload);

  const response = await fetch(
    `https://${normalizedRemote}/_congruity/federation/v1/voice/join`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, signature }),
    }
  );
  if (!response.ok) {
    throw new Error(`Remote federation voice join failed (${response.status})`);
  }

  return response.json();
}

module.exports = {
  joinFederatedVoiceRoom,
  signFederationPayload,
  verifyFederationSignature,
  stableStringify,
  getServerDomain,
  normalizeRemoteServer,
  isFederationServerAllowed,
};
