import { Router } from "express";
import {
  createConversation,
  getConversationMessages,
  listChatContacts,
  listConversations,
  sendMessage
} from "../controllers/chat.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { upload } from "../utils/upload.js";

export const chatRouter = Router();

chatRouter.use(authenticate);
chatRouter.get("/contacts", listChatContacts);
chatRouter.get("/conversations", listConversations);
chatRouter.post("/conversations", createConversation);
chatRouter.get("/conversations/:id/messages", getConversationMessages);
chatRouter.post("/messages", upload.single("image"), sendMessage);
