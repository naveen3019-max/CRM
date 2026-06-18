import { pool } from "../config/db.js";

export async function createNotificationRecord({ userId, message, payloadJson }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, message, payload_json)
     VALUES ($1, $2, $3) RETURNING id`,
    [userId, message, payloadJson ? JSON.stringify(payloadJson) : null]
  );
  return rows[0].id;
}

export async function createNotificationForAllAdmins(message, payloadJson) {
  const { rows: admins } = await pool.query(
    `SELECT id FROM users WHERE role = 'admin'`
  );
  
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
  const { rows } = await pool.query(
    `SELECT id, user_id AS "userId", message, payload_json AS "payloadJson",
            read_status AS "readStatus", created_at AS "createdAt"
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
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
  const result = await pool.query(
    `UPDATE notifications
     SET read_status = true
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
  return result.rowCount > 0;
}
