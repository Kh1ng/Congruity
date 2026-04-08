const userSockets = new Map();
const socketUsers = new Map();

function registerUserSocket(userId, socketId) {
  if (!userId || !socketId) return;
  const sockets = userSockets.get(userId) || new Set();
  sockets.add(socketId);
  userSockets.set(userId, sockets);
  socketUsers.set(socketId, userId);
}

function unregisterSocket(socketId) {
  const userId = socketUsers.get(socketId);
  if (!userId) return;

  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      userSockets.delete(userId);
    } else {
      userSockets.set(userId, sockets);
    }
  }

  socketUsers.delete(socketId);
}

function getUserSockets(userId) {
  return Array.from(userSockets.get(userId) || []);
}

function getSocketUser(socketId) {
  return socketUsers.get(socketId) || null;
}

module.exports = {
  registerUserSocket,
  unregisterSocket,
  getUserSockets,
  getSocketUser,
};
