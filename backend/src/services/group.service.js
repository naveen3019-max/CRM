import { ApiError } from "../utils/ApiError.js";
import { emitToUser } from "../sockets/state.js";
import { getAvailableChatRolesForRole, getAllowedScopesForRole } from "../utils/chatPolicy.js";
import { ROLES } from "../utils/constants.js";
import {
  createGroup,
  getGroupById,
  listUserGroups,
  listGroupsByScope,
  addGroupMember,
  removeGroupMember,
  getGroupMembers as getGroupMembersInGroup,
  isGroupMember,
  updateGroup,
  deleteGroup,
  createGroupMessage,
  listGroupMessages,
  markGroupMessageRead,
  getUnreadGroupMessages,
  markGroupMessageUnreadForMembers,
  getTotalGroupUnreadCount,
  getUnreadGroupsForUser
} from "../repositories/group.repository.js";
import { listPinnedGroupMessages } from "../repositories/chat.repository.js";
import { findUserById, listUsersByRoles } from "../repositories/user.repository.js";
import { getCounterpartRoles } from "../utils/chatPolicy.js";

export async function createNewGroup(actor, payload) {
  const { name, description, scope = "custom", memberIds = [] } = payload;

  if (!name || name.trim().length === 0) {
    throw new ApiError(400, "Group name is required");
  }

  const normalizedMemberIds = Array.from(new Set(memberIds.map((memberId) => Number(memberId)).filter(Boolean)));
  const allowedRoles = getAvailableChatRolesForRole(actor.role);

  if (scope !== "custom") {
    const allowedScopes = getAllowedScopesForRole(actor.role);
    if (!allowedScopes.includes(scope)) {
      throw new ApiError(403, "You don't have access to create groups in this scope");
    }
  }

  for (const memberId of normalizedMemberIds) {
    const member = await findUserById(memberId);
    if (!member) {
      throw new ApiError(404, `User ${memberId} not found`);
    }

    if (!allowedRoles.includes(member.role)) {
      throw new ApiError(403, `User with role "${member.role}" cannot be added to this group`);
    }
  }

  // Create group
  const groupId = await createGroup(name, description || null, scope, actor.id);

  // Add creator as admin
  await addGroupMember(groupId, actor.id, 'admin');

  // Add other members
  if (normalizedMemberIds.length > 0) {
    for (const memberId of normalizedMemberIds) {
      await addGroupMember(groupId, memberId, 'member');
    }
  }

  // Emit event to all members
  for (const memberId of [actor.id, ...normalizedMemberIds]) {
    emitToUser(memberId, "group:created", { groupId, name, scope });
  }

  return { id: groupId, name, description, scope, createdBy: actor.id };
}

export async function getGroup(actor, groupId) {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Verify actor is member
  const isMember = await isGroupMember(groupId, actor.id);
  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  return group;
}

export async function getUserGroups(actor) {
  return listUserGroups(actor.id);
}

export async function getGroupsByScope(actor, scope) {
  const allowedScopes = getAllowedScopesForRole(actor.role);
  if (!allowedScopes.includes(scope)) {
    throw new ApiError(403, "You don't have access to this scope");
  }

  return listGroupsByScope(scope, actor.id);
}

export async function addMemberToGroup(actor, groupId, userId) {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Verify actor is admin of group
  const isMember = await isGroupMember(groupId, actor.id);
  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  const members = await getGroupMembers(groupId);
  const actorMembership = members.find(m => m.id === actor.id);
  if (actorMembership?.memberRole !== 'admin') {
    throw new ApiError(403, "Only group admins can add members");
  }

  // Verify user exists
  const newMember = await findUserById(userId);
  if (!newMember) {
    throw new ApiError(404, "User not found");
  }

  // Add member
  await addGroupMember(groupId, userId, 'member');

  // Notify group members
  const groupMembers = await getGroupMembers(groupId);
  for (const member of groupMembers) {
    emitToUser(member.id, "group:member:added", { groupId, userId, userName: newMember.name });
  }

  return { success: true };
}

export async function removeMemberFromGroup(actor, groupId, userId) {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Verify actor is admin of group
  const isMember = await isGroupMember(groupId, actor.id);
  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  const members = await getGroupMembers(groupId);
  const actorMembership = members.find(m => m.id === actor.id);
  if (actorMembership?.memberRole !== 'admin') {
    throw new ApiError(403, "Only group admins can remove members");
  }

  // Can't remove yourself
  if (userId === actor.id) {
    throw new ApiError(400, "You cannot remove yourself from the group");
  }

  // Remove member
  await removeGroupMember(groupId, userId);

  // Notify group members
  for (const member of members) {
    if (member.id !== userId) {
      emitToUser(member.id, "group:member:removed", { groupId, userId });
    }
  }

  // Notify removed user
  emitToUser(userId, "group:removed_member", { groupId });

  return { success: true };
}

export async function sendGroupMessage(actor, groupId, payload) {
  const { message, imageUrl } = payload;

  const hasText = Boolean(message && String(message).trim());
  const hasImage = Boolean(imageUrl && String(imageUrl).trim());
  if (!hasText && !hasImage) {
    throw new ApiError(400, "Message text or image is required");
  }

  // Verify actor is member
  const isMember = await isGroupMember(groupId, actor.id);
  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  // Create message
  const messageId = await createGroupMessage(
    groupId,
    actor.id,
    hasText ? String(message).trim() : null,
    hasImage ? String(imageUrl).trim() : null
  );

  // Mark as unread for other members
  await markGroupMessageUnreadForMembers(groupId, messageId, actor.id);

  // Get sender info for notification
  const sender = await findUserById(actor.id);

  // Get all group members
  const members = await getGroupMembers(groupId);

  const messagePayload = {
    id: messageId,
    groupId,
    senderId: actor.id,
    senderName: sender.name,
    message: hasText ? String(message).trim() : null,
    imageUrl: hasImage ? String(imageUrl).trim() : null,
    createdAt: new Date().toISOString()
  };

  // Emit to all members
  for (const member of members) {
    emitToUser(member.id, "group:message", messagePayload);
    emitToUser(member.id, "group:message:received", {
      ...messagePayload,
      timestamp: messagePayload.createdAt,
      message: messagePayload.message
    });
  }

  return messagePayload;
}

export async function getGroupMessageHistory(actor, groupId, limit = 50, offset = 0) {
  // Verify actor is member
  const isMember = await isGroupMember(groupId, actor.id);
  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  return listGroupMessages(groupId, limit, offset);
}

export async function getPinnedGroupMessages(actor, groupId) {
  const isMember = await isGroupMember(groupId, actor.id);
  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  return listPinnedGroupMessages(groupId);
}

export async function markGroupMessagesRead(actor, groupId, messageIds = []) {
  // Verify actor is member
  const isMember = await isGroupMember(groupId, actor.id);
  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  // Mark as read
  for (const messageId of messageIds) {
    await markGroupMessageRead(groupId, messageId, actor.id);
  }

  return { success: true };
}

export async function getGroupUnreadCount(actor, groupId) {
  // Verify actor is member
  const isMember = await isGroupMember(groupId, actor.id);
  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  const unreadCount = await getUnreadGroupMessages(groupId, actor.id);
  return { groupId, unreadCount };
}

export async function getTotalGroupsUnreadCount(actor) {
  const result = await getTotalGroupUnreadCount(actor.id);
  return result;
}

export async function getGroupsWithUnread(actor) {
  return getUnreadGroupsForUser(actor.id);
}

export async function updateGroupInfo(actor, groupId, payload) {
  const { name, description } = payload;

  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Verify actor is admin of group
  const members = await getGroupMembers(groupId);
  const actorMembership = members.find(m => m.id === actor.id);
  if (actorMembership?.memberRole !== 'admin') {
    throw new ApiError(403, "Only group admins can update group info");
  }

  await updateGroup(groupId, name || group.name, description);

  // Notify group members
  for (const member of members) {
    emitToUser(member.id, "group:updated", { groupId, name, description });
  }

  return { success: true };
}

export async function deleteGroupChat(actor, groupId) {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  // Verify actor created the group or is admin
  if (group.created_by !== actor.id) {
    const members = await getGroupMembers(groupId);
    const actorMembership = members.find(m => m.id === actor.id);
    if (actorMembership?.memberRole !== 'admin') {
      throw new ApiError(403, "Only group creator or admin can delete the group");
    }
  }

  // Get all members before deletion
  const members = await getGroupMembers(groupId);

  // Delete group (cascades to messages and members)
  await deleteGroup(groupId);

  // Notify group members
  for (const member of members) {
    emitToUser(member.id, "group:deleted", { groupId });
  }

  return { success: true };
}

export async function getGroupMembers(actor, groupId) {
  const isMember = await isGroupMember(groupId, actor.id);
  if (!isMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  return getGroupMembersInGroup(groupId);
}
