import { ApiError } from "../utils/ApiError.js";
import {
  listNotificationsForUser,
  markNotificationReadById
} from "../repositories/notification.repository.js";

export async function getNotifications(userId) {
  return listNotificationsForUser(userId);
}

export async function markRead(notificationId, userId) {
  const updated = await markNotificationReadById(notificationId, userId);
  if (!updated) {
    throw new ApiError(404, "Notification not found");
  }
  return { success: true };
}
