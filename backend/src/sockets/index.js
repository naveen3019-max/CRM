import { Server } from "socket.io";
import { env } from "../config/env.js";
import { registerChatSocket } from "./chat.socket.js";
import { setIoInstance } from "./state.js";

export function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true
    }
  });

  setIoInstance(io);
  registerChatSocket(io);

  return io;
}
