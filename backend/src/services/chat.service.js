import { ApiError } from "../utils/ApiError.js";
import { emitToGroup, emitToUser } from "../sockets/state.js";
import {
  getAllowedScopesForRole,
  getAvailableChatRolesForRole,
  getCounterpartRoles,
  getConversationScopeForRoles,
  validateConversationScope
} from "../utils/chatPolicy.js";
import {
  createConversationRecord,
  createMessageRecord,
  getConversationById,
  getMessageById,
  findConversation,
  listConversationMessages,
  listPinnedConversationMessages,
  listPinnedGroupMessages,
  listConversationsForUser,
  listUnreadCountsForUsers,
  listContactsWithUnreadCounts,
  markConversationMessagesRead,
  setMessagePinState
} from "../repositories/chat.repository.js";
import { createNotificationRecord } from "../repositories/notification.repository.js";
import { findUserById, listUsersByRoles } from "../repositories/user.repository.js";
import { getGroupMembers, isGroupMember, getGroupById } from "../repositories/group.repository.js";
import { ROLES } from "../utils/constants.js";

export async function getConversations(actor) {
  return listConversationsForUser(actor.id);
}

export async function getTotalUnread(actor) {
  const allowedScopes = getAllowedScopesForRole(actor.role);
  
  if (!allowedScopes.length) {
    return 0;
  }

  const unreadByScope = await Promise.all(
    allowedScopes.map(async (scope) => {
      const roles = getCounterpartRoles(scope, actor.role);
      const contacts = await listContactsWithUnreadCounts(scope, actor.id, roles, actor.id);
      const scopeUnread = contacts.reduce((sum, contact) => sum + Number(contact.unreadCount || 0), 0);
      return scopeUnread;
    })
  );

  const total = unreadByScope.reduce((sum, count) => sum + count, 0);
  return total;
}


export async function getContacts(actor, scope) {
  const roles = getCounterpartRoles(scope, actor.role);
  // Use optimized single query instead of two separate queries
  return listContactsWithUnreadCounts(scope, actor.id, roles, actor.id);
}

export async function getAvailableUsers(actor) {
  const roles = getAvailableChatRolesForRole(actor.role);
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

export async function getOrCreateConversation(actor, targetUserId) {
  const otherUser = await findUserById(targetUserId);
  if (!otherUser) {
    throw new ApiError(404, "Conversation participant not found");
  }

  const scope = getConversationScopeForRoles(actor.role, otherUser.role);
  let conversation = await findConversation(scope, actor.id, otherUser.id);

  if (!conversation) {
    const conversationId = await createConversationRecord(scope, actor.id, otherUser.id);
    conversation = {
      id: conversationId,
      scope,
      participantLowId: Math.min(actor.id, otherUser.id),
      participantHighId: Math.max(actor.id, otherUser.id)
    };
  }

  return {
    chatId: conversation.id,
    conversationId: conversation.id,
    scope,
    targetUserId: otherUser.id
  };
}

export async function getMessages(actor, conversationId, limit = 50, offset = 0) {
  const conversations = await listConversationsForUser(actor.id);
  const hasAccess = conversations.some((conversation) => conversation.id === Number(conversationId));

  if (!hasAccess) {
    throw new ApiError(403, "You do not have access to this conversation");
  }

  await markConversationMessagesRead(conversationId, actor.id);
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

function canPinDirectMessage(actor, message) {
  return true;
}

async function canPinGroupMessage(actor, message) {
  if (!(await isGroupMember(Number(message.groupId), actor.id))) {
    return false;
  }

  return true;
}

export async function pinMessage(actor, messageId) {
  const message = await getMessageById(messageId);
  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  let eventPayload = { messageId: Number(message.id), pinned: true };

  if (message.isGroupMessage) {
    if (!(await canPinGroupMessage(actor, message))) {
      throw new ApiError(403, "You cannot pin this message");
    }

    await setMessagePinState(message.id, true);
    const group = await getGroupById(message.groupId);
    eventPayload = {
      ...eventPayload,
      groupId: Number(message.groupId),
      senderId: Number(message.senderId),
      groupName: group?.name || null
    };
    emitToGroup(message.groupId, "messagePinned", eventPayload);
    return { message, eventPayload };
  }

  const conversation = await getConversationById(message.conversationId);
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const isParticipant =
    Number(conversation.participantLowId) === Number(actor.id) || Number(conversation.participantHighId) === Number(actor.id);
  if (!isParticipant || !canPinDirectMessage(actor, message)) {
    throw new ApiError(403, "You cannot pin this message");
  }

  await setMessagePinState(message.id, true);

  eventPayload = {
    ...eventPayload,
    conversationId: Number(message.conversationId),
    senderId: Number(message.senderId),
    receiverId: Number(message.receiverId)
  };

  emitToUser(conversation.participantLowId, "messagePinned", eventPayload);
  emitToUser(conversation.participantHighId, "messagePinned", eventPayload);

  return { message, eventPayload };
}

export async function unpinMessage(actor, messageId) {
  const message = await getMessageById(messageId);
  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  let eventPayload = { messageId: Number(message.id), pinned: false };

  if (message.isGroupMessage) {
    if (!(await canPinGroupMessage(actor, message))) {
      throw new ApiError(403, "You cannot unpin this message");
    }

    await setMessagePinState(message.id, false);
    eventPayload = {
      ...eventPayload,
      groupId: Number(message.groupId),
      senderId: Number(message.senderId)
    };
    emitToGroup(message.groupId, "messageUnpinned", eventPayload);
    return { message, eventPayload };
  }

  const conversation = await getConversationById(message.conversationId);
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const isParticipant =
    Number(conversation.participantLowId) === Number(actor.id) || Number(conversation.participantHighId) === Number(actor.id);
  if (!isParticipant || !canPinDirectMessage(actor, message)) {
    throw new ApiError(403, "You cannot unpin this message");
  }

  await setMessagePinState(message.id, false);
  eventPayload = {
    ...eventPayload,
    conversationId: Number(message.conversationId),
    senderId: Number(message.senderId),
    receiverId: Number(message.receiverId)
  };

  emitToUser(conversation.participantLowId, "messageUnpinned", eventPayload);
  emitToUser(conversation.participantHighId, "messageUnpinned", eventPayload);

  return { message, eventPayload };
}

export async function getPinnedConversationMessages(actor, conversationId) {
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const isParticipant =
    Number(conversation.participantLowId) === Number(actor.id) || Number(conversation.participantHighId) === Number(actor.id);
  if (!isParticipant) {
    throw new ApiError(403, "You do not have access to this conversation");
  }

  return listPinnedConversationMessages(conversationId);
}

export async function getPinnedGroupMessages(actor, groupId) {
  const isMember = await isGroupMember(groupId, actor.id);
  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  return listPinnedGroupMessages(groupId);
}
