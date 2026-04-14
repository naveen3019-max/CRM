import { pool } from "../config/db.js";

function sortParticipants(userA, userB) {
  const first = Number(userA);
  const second = Number(userB);
  return first < second ? [first, second] : [second, first];
}

export async function findConversation(scope, userA, userB) {
  const [lowUserId, highUserId] = sortParticipants(userA, userB);
  const [rows] = await pool.query(
    `SELECT id, scope, participant_low_id AS participantLowId, participant_high_id AS participantHighId,
            created_at AS createdAt, last_message_at AS lastMessageAt
     FROM conversations
     WHERE scope = ? AND participant_low_id = ? AND participant_high_id = ?
     LIMIT 1`,
    [scope, lowUserId, highUserId]
  );
  return rows[0] || null;
}

export async function createConversationRecord(scope, userA, userB) {
  const [lowUserId, highUserId] = sortParticipants(userA, userB);
  const [result] = await pool.query(
    `INSERT INTO conversations (scope, participant_low_id, participant_high_id)
     VALUES (?, ?, ?)`,
    [scope, lowUserId, highUserId]
  );
  return result.insertId;
}

export async function listConversationsForUser(userId) {
  const [rows] = await pool.query(
    `SELECT c.id, c.scope, c.participant_low_id AS participantLowId, c.participant_high_id AS participantHighId,
            c.last_message_at AS lastMessageAt,
            ul.id AS lowUserId, ul.name AS lowUserName,
            uh.id AS highUserId, uh.name AS highUserName
     FROM conversations c
     INNER JOIN users ul ON ul.id = c.participant_low_id
     INNER JOIN users uh ON uh.id = c.participant_high_id
     WHERE c.participant_low_id = ? OR c.participant_high_id = ?
     ORDER BY c.last_message_at DESC`,
    [userId, userId]
  );
  return rows;
}

export async function createMessageRecord({ conversationId, senderId, receiverId, messageBody, imageUrl }) {
  const [result] = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_body, image_url)
     VALUES (?, ?, ?, ?, ?)`,
    [conversationId, senderId, receiverId, messageBody || null, imageUrl || null]
  );

  await pool.query(
    `UPDATE conversations
     SET last_message_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [conversationId]
  );

  return result.insertId;
}

export async function listConversationMessages(conversationId, limit, offset) {
  const [rows] = await pool.query(
    `SELECT id, conversation_id AS conversationId, sender_id AS senderId, receiver_id AS receiverId,
            message_body AS messageBody, image_url AS imageUrl, is_read AS isRead, created_at AS createdAt
     FROM messages
     WHERE conversation_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [conversationId, limit, offset]
  );

  return rows.reverse();
}
