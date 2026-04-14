let ioInstance = null;

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
