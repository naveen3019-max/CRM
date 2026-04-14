import { ApiError } from "../utils/ApiError.js";
import { emitToUser } from "../sockets/state.js";
import { getCounterpartRoles, validateConversationScope } from "../utils/chatPolicy.js";
import {
  createConversationRecord,
  createMessageRecord,
  findConversation,
  listConversationMessages,
  listConversationsForUser
} from "../repositories/chat.repository.js";
import { createNotificationRecord } from "../repositories/notification.repository.js";
import { findUserById, listUsersByRoles } from "../repositories/user.repository.js";

export async function getConversations(actor) {
  return listConversationsForUser(actor.id);
}

export async function getContacts(actor, scope) {
  const roles = getCounterpartRoles(scope, actor.role);
  return listUsersByRoles(roles, actor.id);
}

export async function openConversation(actor, payload) {
  const otherUser = await findUserById(payload.otherUserId);
  if (!otherUser) {
    throw new ApiError(404, "Conversation participant not found");
  }

  validateConversationScope(payload.scope, actor.role, otherUser.role);

  let conversation = await findConversation(payload.scope, actor.id, payload.otherUserId);
  if (!conversation) {
    const conversationId = await createConversationRecord(payload.scope, actor.id, payload.otherUserId);
    conversation = {
      id: conversationId,
      scope: payload.scope,
      participantLowId: Math.min(actor.id, payload.otherUserId),
      participantHighId: Math.max(actor.id, payload.otherUserId)
    };
  }

  return conversation;
}

export async function getMessages(actor, conversationId, limit = 50, offset = 0) {
  const conversations = await listConversationsForUser(actor.id);
  const hasAccess = conversations.some((conversation) => conversation.id === Number(conversationId));

  if (!hasAccess) {
    throw new ApiError(403, "You do not have access to this conversation");
  }

  return listConversationMessages(conversationId, limit, offset);
}

export async function sendConversationMessage(actor, payload) {
  const hasText = Boolean(payload.message && String(payload.message).trim());
  const hasImage = Boolean(payload.imageUrl && String(payload.imageUrl).trim());
  if (!hasText && !hasImage) {
    throw new ApiError(400, "Message text or image is required");
  }

  const otherUser = await findUserById(payload.receiverId);
  if (!otherUser) {
    throw new ApiError(404, "Receiver not found");
  }

  const conversation = await openConversation(actor, {
    scope: payload.scope,
    otherUserId: payload.receiverId
  });

  const messageId = await createMessageRecord({
    conversationId: conversation.id,
    senderId: actor.id,
    receiverId: payload.receiverId,
    messageBody: hasText ? String(payload.message).trim() : null,
    imageUrl: hasImage ? String(payload.imageUrl).trim() : null
  });

  const messagePayload = {
    id: messageId,
    conversationId: conversation.id,
    senderId: actor.id,
    receiverId: payload.receiverId,
    messageBody: hasText ? String(payload.message).trim() : null,
    imageUrl: hasImage ? String(payload.imageUrl).trim() : null,
    createdAt: new Date().toISOString()
  };

  emitToUser(actor.id, "chat:message", messagePayload);
  emitToUser(payload.receiverId, "chat:message", messagePayload);

  await createNotificationRecord({
    userId: payload.receiverId,
    message: "You have a new chat message",
    payloadJson: { type: "chat.message", conversationId: conversation.id }
  });

  emitToUser(payload.receiverId, "notification:new", {
    type: "chat.message",
    conversationId: conversation.id
  });

  return messagePayload;
}
