let ioInstance = null;
const userConnectionCounts = new Map();

export function setIoInstance(io) {
  ioInstance = io;
}

export function getIoInstance() {
  return ioInstance;
}

export function emitToUser(userId, eventName, payload) {
  if (!ioInstance) {
    return;
  }
  ioInstance.to(`user:${userId}`).emit(eventName, payload);
}

export function emitToGroup(groupId, eventName, payload) {
  if (!ioInstance) {
    return;
  }
  ioInstance.to(`group:${groupId}`).emit(eventName, payload);
}

export function emitToAll(eventName, payload) {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit(eventName, payload);
}

export function markUserConnected(userId) {
  const normalized = Number(userId);
  const previous = userConnectionCounts.get(normalized) || 0;
  const next = previous + 1;
  userConnectionCounts.set(normalized, next);
  return previous === 0;
}

export function markUserDisconnected(userId) {
  const normalized = Number(userId);
  const previous = userConnectionCounts.get(normalized) || 0;

  if (previous <= 1) {
    userConnectionCounts.delete(normalized);
    return true;
  }

  userConnectionCounts.set(normalized, previous - 1);
  return false;
}

export function getOnlineUserIds() {
  return Array.from(userConnectionCounts.keys());
}
