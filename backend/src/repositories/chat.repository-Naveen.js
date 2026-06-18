import { pool } from "../config/db.js";
import { expandChatRoles } from "../utils/roleUtils.js";

let translationColumnsReady = false;

let locationColumnsReady = false;

// Ensure translation columns exist at module initialization
async function ensureTranslationColumnsExist() {
  if (translationColumnsReady) return;
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = current_schema() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'original_message'"
    );
    const exists = rows && rows[0] && rows[0].cnt ? Number(rows[0].cnt) > 0 : false;
    if (!exists) {
      console.log('[DB] Adding translation columns to messages table...');
      try {
        await pool.query(`ALTER TABLE messages ADD COLUMN original_message TEXT NULL`);
      } catch (e1) {
        if (e1.code !== '42701') throw e1;
      }
      try {
        await pool.query(`ALTER TABLE messages ADD COLUMN original_language VARCHAR(10) NULL`);
      } catch (e2) {
        if (e2.code !== '42701') throw e2;
      }
      try {
        await pool.query(`ALTER TABLE messages ADD COLUMN translated_messages JSON NULL`);
      } catch (e3) {
        if (e3.code !== '42701') throw e3;
      }
      console.log('[DB] Translation columns added successfully');
    }
    translationColumnsReady = true;
  } catch (err) {
    console.warn('[DB] Warning: Translation columns may not exist:', err && err.message);
  }
}

async function ensureLocationColumnsExist() {
  if (locationColumnsReady) return;
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = current_schema() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'latitude'"
    );
    const exists = rows && rows[0] && rows[0].cnt ? Number(rows[0].cnt) > 0 : false;
    if (!exists) {
      console.log('[DB] Adding location columns to messages table...');
      try {
        await pool.query(`ALTER TABLE messages ADD COLUMN latitude DECIMAL(10, 8) NULL`);
      } catch (e1) {
        if (e1.code !== '42701') throw e1;
      }
      try {
        await pool.query(`ALTER TABLE messages ADD COLUMN longitude DECIMAL(11, 8) NULL`);
      } catch (e2) {
        if (e2.code !== '42701') throw e2;
      }
      try {
        await pool.query(`ALTER TABLE messages ADD COLUMN address TEXT NULL`);
      } catch (e3) {
        if (e3.code !== '42701') throw e3;
      }
      try {
        await pool.query(`ALTER TABLE messages ADD COLUMN map_url TEXT NULL`);
      } catch (e4) {
        if (e4.code !== '42701') throw e4;
      }
      console.log('[DB] Location columns added successfully');
    }
    locationColumnsReady = true;
  } catch (err) {
    console.warn('[DB] Warning: Location columns may not exist:', err && err.message);
  }
}

// Trigger initialization
ensureTranslationColumnsExist().catch(err => console.warn('[DB] Init error:', err));
ensureLocationColumnsExist().catch(err => console.warn('[DB] Location init error:', err));

// Helper to extract translation fields or nulls if columns don't exist
function getTranslationFieldsSQL(prefix = 'm') {
  return `${prefix}.original_message AS "originalMessage", ${prefix}.original_language AS "originalLanguage", ${prefix}.translated_messages AS "translatedMessages"`;
}

function getLocationFieldsSQL(prefix = 'm') {
  return `${prefix}.latitude AS "latitude", ${prefix}.longitude AS "longitude", ${prefix}.address AS "address", ${prefix}.map_url AS "mapUrl"`;
}

// Helper to handle queries that might fail due to missing columns
async function executeQueryWithFallback(query, fallbackQuery, params) {
  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (err) {
    if (err.code === '42703' && (err.message.includes('original_message') || err.message.includes('latitude') || err.message.includes('map_url') || err.message.includes('address'))) {
      console.log('[DB] Missing message columns detected, attempting to fix and use fallback query');
      // Ensure both translation and location columns exist
      await ensureTranslationColumnsExist();
      await ensureLocationColumnsExist();
      const { rows } = await pool.query(fallbackQuery, params);
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
  const { rows } = await pool.query(
    `SELECT id, scope, participant_low_id AS "participantLowId", participant_high_id AS "participantHighId",
            created_at AS "createdAt", last_message_at AS "lastMessageAt"
     FROM conversations
     WHERE scope = $1 AND participant_low_id = $2 AND participant_high_id = $3
     LIMIT 1`,
    [scope, lowUserId, highUserId]
  );
  return rows[0] || null;
}

export async function createConversationRecord(scope, userA, userB) {
  const [lowUserId, highUserId] = sortParticipants(userA, userB);
  const { rows } = await pool.query(
    `INSERT INTO conversations (scope, participant_low_id, participant_high_id)
     VALUES ($1, $2, $3) RETURNING id`,
    [scope, lowUserId, highUserId]
  );
  return rows[0].id;
}

export async function getConversationById(conversationId) {
  const { rows } = await pool.query(
    `SELECT id, scope, participant_low_id AS "participantLowId", participant_high_id AS "participantHighId",
            created_at AS "createdAt", last_message_at AS "lastMessageAt"
     FROM conversations
     WHERE id = $1
     LIMIT 1`,
    [conversationId]
  );

  return rows[0] || null;
}

export async function getMessageById(messageId) {
  const query = `SELECT m.id, m.conversation_id AS "conversationId", m.group_id AS "groupId", m.sender_id AS "senderId",
            m.receiver_id AS "receiverId", m.message_body AS "messageBody", m.image_url AS "imageUrl",
            ${getTranslationFieldsSQL('m')}, ${getLocationFieldsSQL('m')},
            m.is_read AS "isRead", m.is_group_message AS "isGroupMessage", m.pinned AS "pinned",
            m.pinned_at AS "pinnedAt", m.created_at AS "createdAt"
     FROM messages m
     WHERE m.id = $1
     LIMIT 1`;

  const fallbackQuery = `SELECT m.id, m.conversation_id AS "conversationId", m.group_id AS "groupId", m.sender_id AS "senderId",
            m.receiver_id AS "receiverId", m.message_body AS "messageBody", m.image_url AS "imageUrl",
            NULL AS "originalMessage", NULL AS "originalLanguage", NULL AS "translatedMessages",
            NULL AS "latitude", NULL AS "longitude", NULL AS "address", NULL AS "mapUrl",
            m.is_read AS "isRead", m.is_group_message AS "isGroupMessage", m.pinned AS "pinned",
            m.pinned_at AS "pinnedAt", m.created_at AS "createdAt"
     FROM messages m
     WHERE m.id = $1
     LIMIT 1`;

  const rows = await executeQueryWithFallback(query, fallbackQuery, [messageId]);
  return rows[0] || null;
}

export async function listConversationsForUser(userId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.scope, c.participant_low_id AS "participantLowId", c.participant_high_id AS "participantHighId",
            c.last_message_at AS "lastMessageAt",
            ul.id AS "lowUserId", ul.name AS "lowUserName",
            uh.id AS "highUserId", uh.name AS "highUserName"
     FROM conversations c
     INNER JOIN users ul ON ul.id = c.participant_low_id
     INNER JOIN users uh ON uh.id = c.participant_high_id
     WHERE c.participant_low_id = $1 OR c.participant_high_id = $2
     ORDER BY c.last_message_at DESC`,
    [userId, userId]
  );
  return rows;
}

export async function createMessageRecord({ conversationId, senderId, receiverId, messageBody, imageUrl, latitude = null, longitude = null, address = null, mapUrl = null }) {
  const originalMessage = messageBody || null;
  const originalLanguage = null;
  const translatedMessages = JSON.stringify({});

  const query = `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_body, image_url, original_message, original_language, translated_messages, latitude, longitude, address, map_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`;

  const fallbackQuery = `INSERT INTO messages (conversation_id, sender_id, receiver_id, message_body, image_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`;

  let insertedId;
  try {
    const { rows } = await pool.query(query,
      [conversationId, senderId, receiverId, messageBody || null, imageUrl || null, originalMessage, originalLanguage, translatedMessages, latitude, longitude, address, mapUrl]
    );
    insertedId = rows[0].id;
  } catch (err) {
    if (err.code === '42703') {
      console.log('[DB] Message table missing columns, attempting to ensure translation and location columns');
      await ensureTranslationColumnsExist();
      await ensureLocationColumnsExist();
      try {
        const { rows } = await pool.query(query,
          [conversationId, senderId, receiverId, messageBody || null, imageUrl || null, originalMessage, originalLanguage, translatedMessages, latitude, longitude, address, mapUrl]
        );
        insertedId = rows[0].id;
      } catch (e2) {
        console.log('[DB] Retry insert failed, falling back to minimal insert');
        const { rows } = await pool.query(fallbackQuery,
          [conversationId, senderId, receiverId, messageBody || null, imageUrl || null]
        );
        insertedId = rows[0].id;
      }
    } else {
      throw err;
    }
  }

  await pool.query(
    `UPDATE conversations
     SET last_message_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [conversationId]
  );

  return insertedId;
}

export async function listConversationMessages(conversationId, limit, offset) {
  const query = `SELECT m.id, m.conversation_id AS "conversationId", m.sender_id AS "senderId", m.receiver_id AS "receiverId",
            m.message_body AS "messageBody", m.image_url AS "imageUrl", ${getTranslationFieldsSQL('m')}, ${getLocationFieldsSQL('m')}, m.is_read AS "isRead",
            m.pinned AS "pinned", m.pinned_at AS "pinnedAt", m.created_at AS "createdAt",
            u.name AS "senderName", u.role AS "senderRole"
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1
    ORDER BY m.created_at ASC
     LIMIT $2 OFFSET $3`;

  const fallbackQuery = `SELECT m.id, m.conversation_id AS "conversationId", m.sender_id AS "senderId", m.receiver_id AS "receiverId",
            m.message_body AS "messageBody", m.image_url AS "imageUrl", NULL AS "originalMessage", NULL AS "originalLanguage", NULL AS "translatedMessages", NULL AS "latitude", NULL AS "longitude", NULL AS "address", NULL AS "mapUrl", m.is_read AS "isRead",
            m.pinned AS "pinned", m.pinned_at AS "pinnedAt", m.created_at AS "createdAt",
            u.name AS "senderName", u.role AS "senderRole"
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1
    ORDER BY m.created_at ASC
     LIMIT $2 OFFSET $3`;

  return executeQueryWithFallback(query, fallbackQuery, [conversationId, limit, offset]);
}

export async function markConversationMessagesRead(conversationId, receiverId) {
  const result = await pool.query(
    `UPDATE messages
     SET is_read = true
     WHERE conversation_id = $1 AND receiver_id = $2 AND is_read = false`,
    [conversationId, receiverId]
  );

  return result.rowCount;
}

export async function listUnreadCountsForUsers(scope, receiverId, senderIds = []) {
  if (!Array.isArray(senderIds) || !senderIds.length) {
    return {};
  }

  const placeholders = senderIds.map((_, i) => `$${i + 3}`).join(", ");
  const { rows } = await pool.query(
    `SELECT m.sender_id AS "senderId", COUNT(*) AS "unreadCount"
     FROM messages m
     INNER JOIN conversations c ON c.id = m.conversation_id
     WHERE c.scope = $1
       AND m.receiver_id = $2
       AND m.sender_id IN (${placeholders})
       AND m.is_read = false
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

  const expandedRoles = expandChatRoles(roles);
  const rolePlaceholders = expandedRoles.map((_, i) => `$${i + 3}`).join(", ");
  const query = `
    SELECT 
      u.id, u.name, u.email, u.role, u.is_active AS "isActive", u.created_at AS "createdAt",
      COALESCE(unread."unreadCount", 0) AS "unreadCount"
    FROM users u
    LEFT JOIN (
      SELECT m.sender_id, COUNT(*) AS "unreadCount"
      FROM messages m
      INNER JOIN conversations c ON c.id = m.conversation_id
      WHERE c.scope = $1 AND m.receiver_id = $2 AND m.is_read = false
      GROUP BY m.sender_id
    ) unread ON unread.sender_id = u.id
    WHERE u.role IN (${rolePlaceholders}) AND u.is_active = true
  `;

  const values = [scope, receiverId, ...expandedRoles];

  let finalQuery = query;
  if (excludedUserId) {
    values.push(excludedUserId);
    finalQuery += ` AND u.id <> $${values.length}`;
  }

  finalQuery += " ORDER BY u.name ASC";

  const { rows } = await pool.query(finalQuery, values);
  return rows;
}

export async function getTotalUnreadCount(receiverId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS "totalUnread"
     FROM messages
     WHERE receiver_id = $1 AND is_read = false`,
    [receiverId]
  );
  return rows[0]?.totalUnread || 0;
}

export async function getTotalUnreadCountByScopes(receiverId, scopes = []) {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return 0;
  }

  const scopePlaceholders = scopes.map((_, i) => `$${i + 2}`).join(", ");
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS "totalUnread"
     FROM messages m
     INNER JOIN conversations c ON c.id = m.conversation_id
     WHERE m.receiver_id = $1
       AND m.is_read = false
       AND c.scope IN (${scopePlaceholders})`,
    [receiverId, ...scopes]
  );
  return rows[0]?.totalUnread || 0;
}

export async function listPinnedConversationMessages(conversationId) {
  const query = `SELECT m.id, m.conversation_id AS "conversationId", m.sender_id AS "senderId", m.receiver_id AS "receiverId",
            m.message_body AS "messageBody", m.image_url AS "imageUrl", ${getTranslationFieldsSQL('m')}, ${getLocationFieldsSQL('m')}, m.is_read AS "isRead",
            m.pinned AS "pinned", m.pinned_at AS "pinnedAt", m.created_at AS "createdAt",
            u.name AS "senderName", u.role AS "senderRole"
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE conversation_id = $1 AND pinned = true
     ORDER BY m.pinned_at DESC, m.created_at DESC`;

  const fallbackQuery = `SELECT m.id, m.conversation_id AS "conversationId", m.sender_id AS "senderId", m.receiver_id AS "receiverId",
            m.message_body AS "messageBody", m.image_url AS "imageUrl", NULL AS "originalMessage", NULL AS "originalLanguage", NULL AS "translatedMessages", NULL AS "latitude", NULL AS "longitude", NULL AS "address", NULL AS "mapUrl", m.is_read AS "isRead",
            m.pinned AS "pinned", m.pinned_at AS "pinnedAt", m.created_at AS "createdAt",
            u.name AS "senderName", u.role AS "senderRole"
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE conversation_id = $1 AND pinned = true
     ORDER BY m.pinned_at DESC, m.created_at DESC`;

  return executeQueryWithFallback(query, fallbackQuery, [conversationId]);
}

export async function listPinnedGroupMessages(groupId) {
  const query = `SELECT m.id, m.group_id AS "groupId", m.sender_id AS "senderId", m.receiver_id AS "receiverId",
            m.message_body AS "messageBody", m.image_url AS "imageUrl", ${getTranslationFieldsSQL('m')}, ${getLocationFieldsSQL('m')}, m.is_read AS "isRead",
            m.pinned AS "pinned", m.pinned_at AS "pinnedAt", m.created_at AS "createdAt",
            u.name AS "senderName", u.role AS "senderRole"
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE m.group_id = $1 AND m.is_group_message = true AND m.pinned = true
     ORDER BY m.pinned_at DESC, m.created_at DESC`;

  const fallbackQuery = `SELECT m.id, m.group_id AS "groupId", m.sender_id AS "senderId", m.receiver_id AS "receiverId",
            m.message_body AS "messageBody", m.image_url AS "imageUrl", NULL AS "originalMessage", NULL AS "originalLanguage", NULL AS "translatedMessages", NULL AS "latitude", NULL AS "longitude", NULL AS "address", NULL AS "mapUrl", m.is_read AS "isRead",
            m.pinned AS "pinned", m.pinned_at AS "pinnedAt", m.created_at AS "createdAt",
            u.name AS "senderName", u.role AS "senderRole"
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE m.group_id = $1 AND m.is_group_message = true AND m.pinned = true
     ORDER BY m.pinned_at DESC, m.created_at DESC`;

  return executeQueryWithFallback(query, fallbackQuery, [groupId]);
}

export async function setMessagePinState(messageId, pinned) {
  const result = await pool.query(
    `UPDATE messages
     SET pinned = $1, pinned_at = $2
     WHERE id = $3`,
    [pinned ? true : false, pinned ? new Date() : null, messageId]
  );

  return result.rowCount;
}
