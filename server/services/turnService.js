const crypto = require("crypto");

function getTurnHost() {
  return process.env.TURN_HOST || "localhost";
}

function getTurnSecret() {
  return process.env.TURN_SECRET || "";
}

function getTurnCredentials(userId) {
  const turnSecret = getTurnSecret();
  if (!turnSecret) {
    return null;
  }

  const timestamp = Math.floor(Date.now() / 1000) + 86400;
  const username = `${timestamp}:${userId}`;
  const credential = crypto
    .createHmac("sha1", turnSecret)
    .update(username)
    .digest("base64");

  return { username, credential };
}

function getTurnIceConfig(userId) {
  const credentials = getTurnCredentials(userId);
  if (!credentials) return null;

  const host = getTurnHost();
  return {
    urls: [`turn:${host}:3478`, `turn:${host}:3478?transport=tcp`],
    username: credentials.username,
    credential: credentials.credential,
  };
}

module.exports = {
  getTurnCredentials,
  getTurnIceConfig,
};
