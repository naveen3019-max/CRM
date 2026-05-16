import { pool } from "../config/db.js";

let translationColumnsReady = false;

// Ensure translation columns exist at module initialization
async function ensureTranslationColumnsExist() {
  if (translationColumnsReady) return;
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'original_message'"
    );
    const exists = rows && rows[0] && rows[0].cnt ? Number(rows[0].cnt) > 0 : false;
    if (!exists) {
      console.log('[DB] Adding translation columns to messages table...');
      try {
        await pool.query(`ALTER TABLE messages ADD COLUMN original_message TEXT NULL AFTER image_url`);
      } catch (e1) {
        if (e1.code !== 'ER_DUP_FIELDNAME') throw e1;
      }
      try {
        await pool.query(`ALTER TABLE messages ADD COLUMN original_language VARCHAR(10) NULL AFTER original_message`);
      } catch (e2) {
        if (e2.code !== 'ER_DUP_FIELDNAME') throw e2;
      }
      try {
        await pool.query(`ALTER TABLE messages ADD COLUMN translated_messages JSON NULL AFTER original_language`);
      } catch (e3) {
        if (e3.code !== 'ER_DUP_FIELDNAME') throw e3;
      }
      console.log('[DB] Translation columns added successfully');
    }
    translationColumnsReady = true;
  } catch (err) {
    console.warn('[DB] Warning: Translation columns may not exist:', err && err.message);
  }
}

// Trigger initialization
ensureTranslationColumnsExist().catch(err => console.warn('[DB] Init error:', err));

// Helper to extract translation fields or nulls if columns don't exist
function getTranslationFieldsSQL(prefix = 'm') {
  return `${prefix}.original_message AS originalMessage, ${prefix}.original_language AS originalLanguage, ${prefix}.translated_messages AS translatedMessages`;
}

// Helper to handle queries that might fail due to missing columns
async function executeQueryWithFallback(query, fallbackQuery, params) {
  try {
    const [rows] = await pool.query(query, params);
    return rows;
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR' && err.message.includes('original_message')) {
      console.log('[DB] Translation columns not ready, using fallback query');
      await ensureTranslationColumnsExist();
      const [rows] = await pool.query(fallbackQuery, params);
      return rows;
    }
    throw err;
  }
}

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

export async function getConversationById(conversationId) {
  const [rows] = await pool.query(
    `SELECT id, scope, participant_low_id AS participantLowId, participant_high_id AS participantHighId,
            created_at AS createdAt, last_message_at AS lastMessageAt
     FROM conversations
     WHERE id = ?
     LIMIT 1`,
    [conversationId]
  );

  return rows[0] || null;
}

export async function getMessageById(messageId) {
  const query = `SELECT id, conversation_id AS conversationId, group_id AS groupId, sender_id AS senderId,
            receiver_id AS receiverId, message_body AS messageBody, image_url AS imageUrl,
            original_message AS originalMessage, original_language AS originalLanguage, translated_messages AS translatedMessages,
            is_read AS isRead, is_group_message AS isGroupMessage, pinned AS pinned,
            pinned_at AS pinnedAt, created_at AS createdAt
     FROM messages
     WHERE id = ?
     LIMIT 1`;
  
  const fallbackQuery = `SELECT id, conversation_id AS conversationId, group_id AS groupId, sender_id AS senderId,
            receiver_id AS receiverId, message_body AS messageBody, image_url AS imageUrl,
            NULL AS originalMessage, NULL AS originalLanguage, NULL AS translatedMessages,
            is_read AS isRead, is_group_message AS isGroupMessage, pinned AS pinned,
            pinned_at AS pinnedAt, created_at AS createdAt
     FROM messages
     WHERE id = ?
     LIMIT 1`;
  
  const rows = await executeQueryWithFallback(query, fallbackQuery, [messageId]);
  return rows[0] || null;
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
  const originalMessage = messageBody || null;
  const originalLanguage = null;
  const translatedMessages = JSON.stringify({});

  const query = `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_body, image_url, original_message, original_language, translated_messages)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const fallbackQuery = `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_body, image_url)
     VALUES (?, ?, ?, ?, ?)`;
  
  let result;
  try {
    [result] = await pool.query(query,
      [conversationId, senderId, receiverId, messageBody || null, imageUrl || null, originalMessage, originalLanguage, translatedMessages]
    );
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      console.log('[DB] Translation columns not ready, creating message without translation fields');
      await ensureTranslationColumnsExist();
      [result] = await pool.query(fallbackQuery,
        [conversationId, senderId, receiverId, messageBody || null, imageUrl || null]
      );
    } else {
      throw err;
    }
  }

  await pool.query(
    `UPDATE conversations
     SET last_message_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [conversationId]
  );

  return result.insertId;
}

export async function listConversationMessages(conversationId, limit, offset) {
  const query = `SELECT m.id, m.conversation_id AS conversationId, m.sender_id AS senderId, m.receiver_id AS receiverId,
            m.message_body AS messageBody, m.image_url AS imageUrl, m.original_message AS originalMessage, m.original_language AS originalLanguage, m.translated_messages AS translatedMessages, m.is_read AS isRead,
            m.pinned AS pinned, m.pinned_at AS pinnedAt, m.created_at AS createdAt,
            u.name AS senderName, u.role AS senderRole
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
     LIMIT ? OFFSET ?`;
  
  const fallbackQuery = `SELECT m.id, m.conversation_id AS conversationId, m.sender_id AS senderId, m.receiver_id AS receiverId,
            m.message_body AS messageBody, m.image_url AS imageUrl, NULL AS originalMessage, NULL AS originalLanguage, NULL AS translatedMessages, m.is_read AS isRead,
            m.pinned AS pinned, m.pinned_at AS pinnedAt, m.created_at AS createdAt,
            u.name AS senderName, u.role AS senderRole
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
     LIMIT ? OFFSET ?`;
  
  return executeQueryWithFallback(query, fallbackQuery, [conversationId, limit, offset]);
}

export async function markConversationMessagesRead(conversationId, receiverId) {
  const [result] = await pool.query(
    `UPDATE messages
     SET is_read = 1
     WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0`,
    [conversationId, receiverId]
  );

  return result.affectedRows;
}

export async function listUnreadCountsForUsers(scope, receiverId, senderIds = []) {
  if (!Array.isArray(senderIds) || !senderIds.length) {
    return {};
  }

  const placeholders = senderIds.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT m.sender_id AS senderId, COUNT(*) AS unreadCount
     FROM messages m
     INNER JOIN conversations c ON c.id = m.conversation_id
     WHERE c.scope = ?
       AND m.receiver_id = ?
       AND m.sender_id IN (${placeholders})
       AND m.is_read = 0
     GROUP BY m.sender_id`,
    [scope, receiverId, ...senderIds]
  );

  return rows.reduce((accumulator, row) => {
    accumulator[String(row.senderId)] = Number(row.unreadCount || 0);
    return accumulator;
  }, {});
}

export async function listContactsWithUnreadCounts(scope, receiverId, roles = [], excludedUserId = null) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return [];
  }

  const rolePlaceholders = roles.map(() => "?").join(", ");
  const query = `
    SELECT 
      u.id, u.name, u.email, u.role, u.is_active AS isActive, u.created_at AS createdAt,
      COALESCE(unread.unreadCount, 0) AS unreadCount
    FROM users u
    LEFT JOIN (
      SELECT m.sender_id, COUNT(*) AS unreadCount
      FROM messages m
      INNER JOIN conversations c ON c.id = m.conversation_id
      WHERE c.scope = ? AND m.receiver_id = ? AND m.is_read = 0
      GROUP BY m.sender_id
    ) unread ON unread.sender_id = u.id
    WHERE u.role IN (${rolePlaceholders}) AND u.is_active = 1
  `;

  const values = [scope, receiverId, ...roles];

  let finalQuery = query;
  if (excludedUserId) {
    finalQuery += " AND u.id <> ?";
    values.push(excludedUserId);
  }

  finalQuery += " ORDER BY u.name ASC";

  const [rows] = await pool.query(finalQuery, values);
  return rows;
}

export async function getTotalUnreadCount(receiverId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS totalUnread
     FROM messages
     WHERE receiver_id = ? AND is_read = 0`,
    [receiverId]
  );
  return rows[0]?.totalUnread || 0;
}

export async function getTotalUnreadCountByScopes(receiverId, scopes = []) {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return 0;
  }

  const scopePlaceholders = scopes.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS totalUnread
     FROM messages m
     INNER JOIN conversations c ON c.id = m.conversation_id
     WHERE m.receiver_id = ?
       AND m.is_read = 0
       AND c.scope IN (${scopePlaceholders})`,
    [receiverId, ...scopes]
  );
  return rows[0]?.totalUnread || 0;
}

export async function listPinnedConversationMessages(conversationId) {
  const query = `SELECT m.id, m.conversation_id AS conversationId, m.sender_id AS senderId, m.receiver_id AS receiverId,
            m.message_body AS messageBody, m.image_url AS imageUrl, m.original_message AS originalMessage, m.original_language AS originalLanguage, m.translated_messages AS translatedMessages, m.is_read AS isRead,
            m.pinned AS pinned, m.pinned_at AS pinnedAt, m.created_at AS createdAt,
            u.name AS senderName, u.role AS senderRole
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE conversation_id = ? AND pinned = 1
     ORDER BY m.pinned_at DESC, m.created_at DESC`;
  
  const fallbackQuery = `SELECT m.id, m.conversation_id AS conversationId, m.sender_id AS senderId, m.receiver_id AS receiverId,
            m.message_body AS messageBody, m.image_url AS imageUrl, NULL AS originalMessage, NULL AS originalLanguage, NULL AS translatedMessages, m.is_read AS isRead,
            m.pinned AS pinned, m.pinned_at AS pinnedAt, m.created_at AS createdAt,
            u.name AS senderName, u.role AS senderRole
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE conversation_id = ? AND pinned = 1
     ORDER BY m.pinned_at DESC, m.created_at DESC`;
  
  return executeQueryWithFallback(query, fallbackQuery, [conversationId]);
}

export async function listPinnedGroupMessages(groupId) {
  const query = `SELECT m.id, m.group_id AS groupId, m.sender_id AS senderId, m.receiver_id AS receiverId,
            m.message_body AS messageBody, m.image_url AS imageUrl, m.original_message AS originalMessage, m.original_language AS originalLanguage, m.translated_messages AS translatedMessages, m.is_read AS isRead,
            m.pinned AS pinned, m.pinned_at AS pinnedAt, m.created_at AS createdAt,
            u.name AS senderName, u.role AS senderRole
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE m.group_id = ? AND m.is_group_message = 1 AND m.pinned = 1
     ORDER BY m.pinned_at DESC, m.created_at DESC`;
  
  const fallbackQuery = `SELECT m.id, m.group_id AS groupId, m.sender_id AS senderId, m.receiver_id AS receiverId,
            m.message_body AS messageBody, m.image_url AS imageUrl, NULL AS originalMessage, NULL AS originalLanguage, NULL AS translatedMessages, m.is_read AS isRead,
            m.pinned AS pinned, m.pinned_at AS pinnedAt, m.created_at AS createdAt,
            u.name AS senderName, u.role AS senderRole
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE m.group_id = ? AND m.is_group_message = 1 AND m.pinned = 1
     ORDER BY m.pinned_at DESC, m.created_at DESC`;
  
  return executeQueryWithFallback(query, fallbackQuery, [groupId]);
}

export async function setMessagePinState(messageId, pinned) {
  const [result] = await pool.query(
    `UPDATE messages
     SET pinned = ?, pinned_at = ?
     WHERE id = ?`,
    [pinned ? 1 : 0, pinned ? new Date() : null, messageId]
  );

  return result.affectedRows;
}

