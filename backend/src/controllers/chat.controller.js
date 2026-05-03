import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getContacts,
  getConversations,
  getPinnedConversationMessages,
  getMessages,
  getTotalUnread,
  pinMessage,
  openConversation,
  unpinMessage,
  sendConversationMessage,
  getAvailableUsers
} from "../services/chat.service.js";

export const listConversations = asyncHandler(async (req, res) => {
  const data = await getConversations(req.user);
  res.json({ success: true, data });
});

export const getTotalUnreadCount = asyncHandler(async (req, res) => {
  const data = await getTotalUnread(req.user);
  res.json({ success: true, data: { totalUnreadCount: data } });
});

export const listChatContacts = asyncHandler(async (req, res) => {
  const data = await getContacts(req.user, req.query.scope);
  res.json({ success: true, data });
});

export const listAvailableUsers = asyncHandler(async (req, res) => {
  const data = await getAvailableUsers(req.user);
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

export const getPinnedMessages = asyncHandler(async (req, res) => {
  const data = await getPinnedConversationMessages(req.user, Number(req.params.conversationId));
  res.json({ success: true, data });
});

export const pinChatMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.body;
  if (!messageId) {
    return res.status(400).json({ success: false, message: "messageId is required" });
  }

  console.debug("[pinChatMessage] userId=%s messageId=%s", req.user?.id, messageId);
  const { eventPayload } = await pinMessage(req.user, Number(messageId));
  console.debug("[pinChatMessage] success eventPayload=%o", eventPayload);
  res.json({ success: true, data: eventPayload });
});

export const unpinChatMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.body;
  if (!messageId) {
    return res.status(400).json({ success: false, message: "messageId is required" });
  }

  console.debug("[unpinChatMessage] userId=%s messageId=%s", req.user?.id, messageId);
  const { eventPayload } = await unpinMessage(req.user, Number(messageId));
  console.debug("[unpinChatMessage] success eventPayload=%o", eventPayload);
  res.json({ success: true, data: eventPayload });
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
