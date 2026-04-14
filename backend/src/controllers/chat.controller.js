import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getContacts,
  getConversations,
  getMessages,
  openConversation,
  sendConversationMessage
} from "../services/chat.service.js";

export const listConversations = asyncHandler(async (req, res) => {
  const data = await getConversations(req.user);
  res.json({ success: true, data });
});

export const listChatContacts = asyncHandler(async (req, res) => {
  const data = await getContacts(req.user, req.query.scope);
  res.json({ success: true, data });
});

export const createConversation = asyncHandler(async (req, res) => {
  const data = await openConversation(req.user, req.body);
  res.status(201).json({ success: true, data });
});

export const getConversationMessages = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);
  const data = await getMessages(req.user, Number(req.params.id), limit, offset);
  res.json({ success: true, data });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const uploadedImageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  const data = await sendConversationMessage(req.user, {
    ...req.body,
    receiverId: Number(req.body.receiverId),
    imageUrl: uploadedImageUrl
  });
  res.status(201).json({ success: true, data });
});
