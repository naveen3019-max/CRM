import { pool } from "../config/db.js";

export async function createNotificationRecord({ userId, message, payloadJson }) {
  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, message, payload_json)
     VALUES (?, ?, ?)`,
    [userId, message, payloadJson ? JSON.stringify(payloadJson) : null]
  );
  return result.insertId;
}

export async function createNotificationForAllAdmins(message, payloadJson) {
  // Get all admin users
  const [admins] = await pool.query(
    `SELECT id FROM users WHERE role = 'admin'`
  );
  
  // Create a notification for each admin
  const notificationIds = [];
  for (const admin of admins) {
    const id = await createNotificationRecord({
      userId: admin.id,
      message,
      payloadJson
    });
    notificationIds.push(id);
  }
  
  return notificationIds;
}

export async function listNotificationsForUser(userId, limit = 50) {
  const [rows] = await pool.query(
    `SELECT id, user_id AS userId, message, payload_json AS payloadJson,
            read_status AS readStatus, created_at AS createdAt
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  );

  return rows.map((row) => {
    let parsedPayload = null;
    if (row.payloadJson) {
      if (typeof row.payloadJson === 'object') {
        parsedPayload = row.payloadJson;
      } else {
        try {
          parsedPayload = JSON.parse(row.payloadJson);
        } catch (e) {
          console.error("Failed to parse notification payloadJson:", row.payloadJson);
          parsedPayload = null;
        }
      }
    }
    return {
      ...row,
      payloadJson: parsedPayload
    };
  });
}

export async function markNotificationReadById(notificationId, userId) {
  const [result] = await pool.query(
    `UPDATE notifications
     SET read_status = 1
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
  return result.affectedRows > 0;
}
