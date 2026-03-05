let roomService = null;

function getLiveKitConfig() {
  return {
    livekitUrl: process.env.LIVEKIT_URL,
    livekitExternalUrl: process.env.LIVEKIT_EXTERNAL_URL || process.env.LIVEKIT_URL,
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
  };
}

function requireSdk() {
  try {
    // Lazy import keeps signaling boot-safe if dependency is temporarily absent.
    // eslint-disable-next-line global-require
    return require("livekit-server-sdk");
  } catch (error) {
    const wrapped = new Error(
      "livekit-server-sdk is not installed. Run `npm install` in /server."
    );
    wrapped.cause = error;
    throw wrapped;
  }
}

function getRoomService() {
  if (roomService) return roomService;
  const { RoomServiceClient } = requireSdk();
  const { livekitUrl, apiKey, apiSecret } = getLiveKitConfig();

  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error(
      "LiveKit configuration is incomplete. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET."
    );
  }

  roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
  return roomService;
}

async function createOrGetRoom(roomName) {
  const service = getRoomService();
  try {
    await service.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 50,
    });
  } catch (error) {
    const message = String(error?.message || "");
    if (
      message.toLowerCase().includes("already exists") ||
      message.toLowerCase().includes("exists")
    ) {
      return;
    }
    throw error;
  }
}

async function generateToken(roomName, participantIdentity, participantName) {
  const { AccessToken } = requireSdk();
  const { apiKey, apiSecret } = getLiveKitConfig();
  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit API credentials are missing.");
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName || participantIdentity,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return token.toJwt();
}

async function getParticipants(roomName) {
  const service = getRoomService();
  return service.listParticipants(roomName);
}

async function removeParticipant(roomName, identity) {
  const service = getRoomService();
  try {
    return await service.removeParticipant(roomName, identity);
  } catch (error) {
    const message = String(error?.message || "");
    if (message.toLowerCase().includes("not found")) {
      return null;
    }
    throw error;
  }
}

function getConnectionInfo() {
  const { livekitExternalUrl } = getLiveKitConfig();
  return {
    livekitUrl: livekitExternalUrl,
  };
}

module.exports = {
  createOrGetRoom,
  generateToken,
  getParticipants,
  removeParticipant,
  getConnectionInfo,
};
