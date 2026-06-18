import { pool } from "../config/db.js";

// Create a new group
export async function createGroup(name, description, scope, createdBy) {
  const { rows } = await pool.query(
    `INSERT INTO "groups" (name, description, scope, created_by)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [name, description || null, scope, createdBy]
  );
  return rows[0].id;
}

// Get group by ID with member count
export async function getGroupById(groupId) {
  const { rows } = await pool.query(
    `SELECT g.*, COUNT(gm.id) as "memberCount"
     FROM "groups" g
     LEFT JOIN group_members gm ON gm.group_id = g.id
     WHERE g.id = $1
     GROUP BY g.id`,
    [groupId]
  );
  return rows[0] || null;
}

// List all groups accessible to a user (groups they're members of)
export async function listUserGroups(userId) {
  const { rows } = await pool.query(
    `SELECT g.*, COUNT(gm.id) as "memberCount"
     FROM "groups" g
     INNER JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1
     GROUP BY g.id
     ORDER BY g.updated_at DESC`,
    [userId]
  );
  return rows;
}

// List all groups in a scope that a user can access
export async function listGroupsByScope(scope, userId = null) {
  if (userId) {
    const { rows } = await pool.query(
      `SELECT g.*, COUNT(gm.id) as "memberCount", 
              CASE WHEN gm2.user_id IS NOT NULL THEN 1 ELSE 0 END as "isMember"
       FROM "groups" g
       LEFT JOIN group_members gm ON gm.group_id = g.id
       LEFT JOIN group_members gm2 ON gm2.group_id = g.id AND gm2.user_id = $1
       WHERE g.scope = $2
       GROUP BY g.id, gm2.user_id
       ORDER BY g.created_at DESC`,
      [userId, scope]
    );
    return rows;
  }
  
  const { rows } = await pool.query(
    `SELECT g.*, COUNT(gm.id) as "memberCount"
     FROM "groups" g
     LEFT JOIN group_members gm ON gm.group_id = g.id
     WHERE g.scope = $1
     GROUP BY g.id
     ORDER BY g.created_at DESC`,
    [scope]
  );
  return rows;
}

// Add member to group
export async function addGroupMember(groupId, userId, role = 'member') {
  const { rows } = await pool.query(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, user_id) DO UPDATE SET role = $4 RETURNING id`,
    [groupId, userId, role, role]
  );
  return rows[0]?.id;
}

// Remove member from group
export async function removeGroupMember(groupId, userId) {
  const result = await pool.query(
    `DELETE FROM group_members
     WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  return result.rowCount;
}

// Get group members with user details
export async function getGroupMembers(groupId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.preferred_language AS "preferredLanguage", gm.role as "memberRole", gm.joined_at
     FROM group_members gm
     INNER JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at ASC`,
    [groupId]
  );
  return rows;
}

// Check if user is member of group
export async function isGroupMember(groupId, userId) {
  const { rows } = await pool.query(
    `SELECT id FROM group_members
     WHERE group_id = $1 AND user_id = $2
     LIMIT 1`,
    [groupId, userId]
  );
  return rows.length > 0;
}

// Update group info
export async function updateGroup(groupId, name, description) {
  const result = await pool.query(
    `UPDATE "groups" SET name = $1, description = $2
     WHERE id = $3`,
    [name, description || null, groupId]
  );
  return result.rowCount > 0;
}

// Delete group
export async function deleteGroup(groupId) {
  const result = await pool.query(
    `DELETE FROM "groups" WHERE id = $1`,
    [groupId]
  );
  return result.rowCount > 0;
}

// Send group message
export async function createGroupMessage(groupId, senderId, messageBody, imageUrl = null) {
  const originalMessage = messageBody || null;
  const translatedMessages = JSON.stringify({});

  const query = `INSERT INTO messages (group_id, sender_id, message_body, image_url, is_group_message, original_message, original_language, translated_messages)
     VALUES ($1, $2, $3, $4, true, $5, $6, $7) RETURNING id`;
  
  const fallbackQuery = `INSERT INTO messages (group_id, sender_id, message_body, image_url, is_group_message)
     VALUES ($1, $2, $3, $4, true) RETURNING id`;
  
  let insertedId;
  try {
    const { rows } = await pool.query(query,
      [groupId, senderId, messageBody || null, imageUrl || null, originalMessage, null, translatedMessages]
    );
    insertedId = rows[0].id;
  } catch (err) {
    if (err.code === '42703') {
      console.log('[DB] Translation columns not ready, creating group message without translation fields');
      const { rows } = await pool.query(fallbackQuery,
        [groupId, senderId, messageBody || null, imageUrl || null]
      );
      insertedId = rows[0].id;
    } else {
      throw err;
    }
  }
  
  return insertedId;
}

// Get group messages with pagination
export async function listGroupMessages(groupId, limit = 50, offset = 0) {
  const query = `SELECT m.id, m.group_id as "groupId", m.sender_id as "senderId", m.message_body as "messageBody", 
            m.image_url as "imageUrl", m.original_message AS "originalMessage", m.original_language AS "originalLanguage", m.translated_messages AS "translatedMessages", m.created_at as "createdAt",
            u.name as "senderName", u.role as "senderRole"
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE m.group_id = $1 AND m.is_group_message = true
      ORDER BY m.created_at ASC
     LIMIT $2 OFFSET $3`;

  const fallbackQuery = `SELECT m.id, m.group_id as "groupId", m.sender_id as "senderId", m.message_body as "messageBody", 
            m.image_url as "imageUrl", NULL AS "originalMessage", NULL AS "originalLanguage", NULL AS "translatedMessages", m.created_at as "createdAt",
            u.name as "senderName", u.role as "senderRole"
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE m.group_id = $1 AND m.is_group_message = true
      ORDER BY m.created_at ASC
     LIMIT $2 OFFSET $3`;

  try {
    const { rows } = await pool.query(query, [groupId, limit, offset]);
    return rows;
  } catch (err) {
    if (err.code === '42703') {
      const { rows } = await pool.query(fallbackQuery, [groupId, limit, offset]);
      return rows;
    }

    throw err;
  }
}

// Mark group message as read for user
export async function markGroupMessageRead(groupId, messageId, userId) {
  const result = await pool.query(
    `DELETE FROM group_message_unread
     WHERE group_id = $1 AND message_id = $2 AND user_id = $3`,
    [groupId, messageId, userId]
  );
  return result.rowCount;
}

// Get unread messages in group for user
export async function getUnreadGroupMessages(groupId, userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) as "unreadCount"
     FROM group_message_unread
     WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  return rows[0]?.unreadCount || 0;
}

// Add unread message entry for all group members except sender
export async function markGroupMessageUnreadForMembers(groupId, messageId, senderId) {
  const { rows: members } = await pool.query(
    `SELECT user_id FROM group_members
     WHERE group_id = $1 AND user_id <> $2`,
    [groupId, senderId]
  );

  if (members.length === 0) return;

  const values = [];
  members.forEach(m => {
    values.push(groupId, m.user_id, messageId);
  });
  
  const placeholders = members.map((_, i) => `($${i*3 + 1}, $${i*3 + 2}, $${i*3 + 3})`).join(",");

  await pool.query(
    `INSERT INTO group_message_unread (group_id, user_id, message_id)
     VALUES ${placeholders}
     ON CONFLICT (group_id, user_id, message_id) DO UPDATE SET created_at = CURRENT_TIMESTAMP`,
    values
  );
}

// Get total unread count across all groups for user
export async function getTotalGroupUnreadCount(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(DISTINCT group_id) as "groupsWithUnread", COUNT(*) as "totalUnread"
     FROM group_message_unread
     WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || { groupsWithUnread: 0, totalUnread: 0 };
}

// Get unread groups for user
export async function getUnreadGroupsForUser(userId) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name, COUNT(gmu.id) as "unreadCount"
     FROM "groups" g
     INNER JOIN group_message_unread gmu ON gmu.group_id = g.id
     WHERE gmu.user_id = $1
     GROUP BY g.id
     ORDER BY g.updated_at DESC`,
    [userId]
  );
  return rows;
}
