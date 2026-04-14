import { pool } from "../config/db.js";

export async function createNotificationRecord({ userId, message, payloadJson }) {
  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, message, payload_json)
     VALUES (?, ?, ?)`,
    [userId, message, payloadJson ? JSON.stringify(payloadJson) : null]
  );
  return result.insertId;
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

  return rows.map((row) => ({
    ...row,
    payloadJson: row.payloadJson ? JSON.parse(row.payloadJson) : null
  }));
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
