import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { emitToAll, emitToUser, getOnlineUserIds, markUserConnected, markUserDisconnected } from "./state.js";

export function registerChatSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const payload = jwt.verify(token, env.jwtSecret);
      socket.user = {
        id: Number(payload.sub),
        role: payload.role
      };

      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userRoom = `user:${socket.user.id}`;
    socket.join(userRoom);

    const becameOnline = markUserConnected(socket.user.id);
    socket.emit("chat:presence:snapshot", {
      onlineUserIds: getOnlineUserIds()
    });

    if (becameOnline) {
      emitToAll("chat:presence:update", {
        userId: socket.user.id,
        isOnline: true,
        lastSeen: null
      });
    }

    socket.on("chat:typing", ({ toUserId, conversationId, isTyping }) => {
      emitToUser(toUserId, "chat:typing", {
        fromUserId: socket.user.id,
        conversationId,
        isTyping: Boolean(isTyping)
      });
    });

    socket.on("disconnect", () => {
      const becameOffline = markUserDisconnected(socket.user.id);
      if (becameOffline) {
        emitToAll("chat:presence:update", {
          userId: socket.user.id,
          isOnline: false,
          lastSeen: new Date().toISOString()
        });
      }

      socket.leave(userRoom);
    });
  });
}
