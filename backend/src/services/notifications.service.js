import { ApiError } from "../utils/ApiError.js";
import {
  listNotificationsForUser,
  markNotificationReadById,
  createNotificationForAllAdmins
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

export async function createVendorVerificationNotification(vendorId, companyName) {
  // Notify all admins of pending vendor verification
  const notificationIds = await createNotificationForAllAdmins(
    `New vendor verification pending: ${companyName}`,
    {
      type: 'vendor_verification',
      vendorId,
      companyName,
      action: 'verify'
    }
  );
  return notificationIds;
}
