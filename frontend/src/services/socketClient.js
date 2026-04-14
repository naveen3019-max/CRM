import { io } from "socket.io-client";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
let socket;
let activeToken = "";

function resolveSocketServerUrl() {
  return API_BASE_URL.replace(/\/api\/?$/, "");
}

export function connectSocket(token) {
  if (!token) {
    return null;
  }

  if (socket && activeToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  activeToken = token;
  socket = io(resolveSocketServerUrl(), {
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: {
      token
    }
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
  socket = null;
  activeToken = "";
}

export const connectChatSocket = connectSocket;
export const getChatSocket = getSocket;
export const disconnectChatSocket = disconnectSocket;
