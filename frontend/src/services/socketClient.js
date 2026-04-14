import { io } from "socket.io-client";
import { API_ORIGIN } from "./runtimeConfig.js";

let socket;
let activeToken = "";

function resolveSocketServerUrl() {
  return API_ORIGIN;
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
