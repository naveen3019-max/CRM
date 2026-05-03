import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createNewGroup,
  getGroup,
  getUserGroups,
  getGroupsByScope,
  addMemberToGroup,
  removeMemberFromGroup,
  sendGroupMessage,
  getGroupMessageHistory,
  markGroupMessagesRead,
  getGroupUnreadCount,
  getPinnedGroupMessages,
  getTotalGroupsUnreadCount,
  getGroupsWithUnread,
  updateGroupInfo,
  deleteGroupChat,
  getGroupMembers
} from "../services/group.service.js";

export const createGroup = asyncHandler(async (req, res) => {
  const data = await createNewGroup(req.user, req.body);
  res.status(201).json({ success: true, data });
});

export const getGroupDetails = asyncHandler(async (req, res) => {
  const data = await getGroup(req.user, Number(req.params.id));
  res.json({ success: true, data });
});

export const listUserGroups = asyncHandler(async (req, res) => {
  const data = await getUserGroups(req.user);
  res.json({ success: true, data });
});

export const listGroupsByScope = asyncHandler(async (req, res) => {
  const scope = req.query.scope;
  if (!scope) {
    return res.status(400).json({ success: false, message: "Scope query parameter is required" });
  }
  const data = await getGroupsByScope(req.user, scope);
  res.json({ success: true, data });
});

export const addMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, message: "userId is required" });
  }
  const data = await addMemberToGroup(req.user, Number(req.params.id), Number(userId));
  res.json({ success: true, data });
});

export const removeMember = asyncHandler(async (req, res) => {
  const data = await removeMemberFromGroup(req.user, Number(req.params.id), Number(req.params.userId));
  res.json({ success: true, data });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const data = await sendGroupMessage(req.user, Number(req.params.id), req.body);
  res.status(201).json({ success: true, data });
});

export const getMessages = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);
  const data = await getGroupMessageHistory(req.user, Number(req.params.id), limit, offset);
  res.json({ success: true, data });
});

export const getPinnedMessages = asyncHandler(async (req, res) => {
  const data = await getPinnedGroupMessages(req.user, Number(req.params.id));
  res.json({ success: true, data });
});

export const markMessagesRead = asyncHandler(async (req, res) => {
  const { messageIds = [] } = req.body;
  const data = await markGroupMessagesRead(req.user, Number(req.params.id), messageIds);
  res.json({ success: true, data });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const data = await getGroupUnreadCount(req.user, Number(req.params.id));
  res.json({ success: true, data });
});

export const getTotalUnread = asyncHandler(async (req, res) => {
  const data = await getTotalGroupsUnreadCount(req.user);
  res.json({ success: true, data });
});

export const getUnreadGroups = asyncHandler(async (req, res) => {
  const data = await getGroupsWithUnread(req.user);
  res.json({ success: true, data });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const data = await updateGroupInfo(req.user, Number(req.params.id), req.body);
  res.json({ success: true, data });
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const data = await deleteGroupChat(req.user, Number(req.params.id));
  res.json({ success: true, data });
});

export const listMembers = asyncHandler(async (req, res) => {
  const data = await getGroupMembers(req.user, Number(req.params.id));
  res.json({ success: true, data });
});
