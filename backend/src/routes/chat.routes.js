import { Router } from "express";
import {
  createConversation,
  getConversationById,
  getOrCreateChat,
  getPinnedMessages,
  listAvailableUsers,
  getConversationMessages,
  getTotalUnreadCount,
  listChatContacts,
  listConversations,
  pinChatMessage,
  unpinChatMessage,
  sendMessage
} from "../controllers/chat.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { chatUpload } from "../utils/upload.js";

export const chatRouter = Router();

chatRouter.use(authenticate);
chatRouter.get("/available-users", listAvailableUsers);
chatRouter.get("/contacts", listChatContacts);
chatRouter.get("/conversations", listConversations);
chatRouter.get("/unread/total", getTotalUnreadCount);
chatRouter.post("/conversations", createConversation);
chatRouter.get("/conversations/:id", getConversationById);
chatRouter.post("/get-or-create", getOrCreateChat);
chatRouter.get("/conversations/:id/messages", getConversationMessages);
chatRouter.get("/pinned/:conversationId", getPinnedMessages);
chatRouter.post("/pin-message", pinChatMessage);
chatRouter.post("/unpin-message", unpinChatMessage);
chatRouter.post("/messages", chatUpload.single("image"), sendMessage);
