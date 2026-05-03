import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { emitToGroup } from "./state.js";
import { isGroupMember, getGroupMembers } from "../repositories/group.repository.js";

export function registerGroupSocket(io) {
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
    const userId = socket.user.id;
    socket.join(`user:${userId}`);

    socket.on("join:group", async ({ groupId }) => {
      try {
        if (!groupId) return;
        const isMember = await isGroupMember(Number(groupId), userId);
        if (isMember) {
          socket.join(`group:${groupId}`);
        }
      } catch (error) {
        console.error(`[GROUP_SOCKET] join:group failed for ${groupId}:`, error);
      }
    });

    socket.on("leave:group", ({ groupId }) => {
      if (!groupId) return;
      socket.leave(`group:${groupId}`);
    });

    socket.on("group:typing", async ({ groupId, isTyping }) => {
      try {
        if (!groupId) return;
        const isMember = await isGroupMember(Number(groupId), userId);
        if (!isMember) return;
        emitToGroup(groupId, "group:user:typing", { userId, groupId, isTyping: Boolean(isTyping) });
      } catch (error) {
        console.error(`[GROUP_SOCKET] typing failed for ${groupId}:`, error);
      }
    });

    socket.on("disconnect", () => {
      // socket.io cleans up room membership automatically
    });
  });
}
