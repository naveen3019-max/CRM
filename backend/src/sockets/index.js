import { Server } from "socket.io";
import { env } from "../config/env.js";
import { createCorsOriginChecker } from "../utils/cors.js";
import { registerChatSocket } from "./chat.socket.js";
import { setIoInstance } from "./state.js";

export function initSocketServer(httpServer) {
  const isAllowedOrigin = createCorsOriginChecker(env.clientUrls);

  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Socket CORS blocked origin: ${origin || "unknown"}`));
      },
      credentials: true
    }
  });

  setIoInstance(io);
  registerChatSocket(io);

  return io;
}
