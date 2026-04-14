import { asyncHandler } from "../utils/asyncHandler.js";
import { getNotifications, markRead } from "../services/notifications.service.js";

export const listNotifications = asyncHandler(async (req, res) => {
  const data = await getNotifications(req.user.id);
  res.json({ success: true, data });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const data = await markRead(Number(req.params.id), req.user.id);
  res.json({ success: true, data });
});
