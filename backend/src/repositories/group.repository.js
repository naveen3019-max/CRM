import { pool } from "../config/db.js";

// Create a new group
export async function createGroup(name, description, scope, createdBy) {
  const [result] = await pool.query(
    `INSERT INTO \`groups\` (name, description, scope, created_by)
     VALUES (?, ?, ?, ?)`,
    [name, description || null, scope, createdBy]
  );
  return result.insertId;
}

// Get group by ID with member count
export async function getGroupById(groupId) {
  const [rows] = await pool.query(
    `SELECT g.*, COUNT(gm.id) as memberCount
     FROM \`groups\` g
     LEFT JOIN group_members gm ON gm.group_id = g.id
     WHERE g.id = ?
     GROUP BY g.id`,
    [groupId]
  );
  return rows[0] || null;
}

// List all groups accessible to a user (groups they're members of)
export async function listUserGroups(userId) {
  const [rows] = await pool.query(
    `SELECT g.*, COUNT(gm.id) as memberCount
     FROM \`groups\` g
     INNER JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = ?
     GROUP BY g.id
     ORDER BY g.updated_at DESC`,
    [userId]
  );
  return rows;
}

// List all groups in a scope that a user can access
export async function listGroupsByScope(scope, userId = null) {
  if (userId) {
    const [rows] = await pool.query(
      `SELECT g.*, COUNT(gm.id) as memberCount, 
              IF(gm2.user_id IS NOT NULL, 1, 0) as isMember
       FROM \`groups\` g
       LEFT JOIN group_members gm ON gm.group_id = g.id
       LEFT JOIN group_members gm2 ON gm2.group_id = g.id AND gm2.user_id = ?
       WHERE g.scope = ?
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [userId, scope]
    );
    return rows;
  }
  
  const [rows] = await pool.query(
    `SELECT g.*, COUNT(gm.id) as memberCount
     FROM \`groups\` g
     LEFT JOIN group_members gm ON gm.group_id = g.id
     WHERE g.scope = ?
     GROUP BY g.id
     ORDER BY g.created_at DESC`,
    [scope]
  );
  return rows;
}

// Add member to group
export async function addGroupMember(groupId, userId, role = 'member') {
  const [result] = await pool.query(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE role = ?`,
    [groupId, userId, role, role]
  );
  return result.insertId;
}

// Remove member from group
export async function removeGroupMember(groupId, userId) {
  const [result] = await pool.query(
    `DELETE FROM group_members
     WHERE group_id = ? AND user_id = ?`,
    [groupId, userId]
  );
  return result.affectedRows;
}

// Get group members with user details
export async function getGroupMembers(groupId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, gm.role as memberRole, gm.joined_at
     FROM group_members gm
     INNER JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = ?
     ORDER BY gm.joined_at ASC`,
    [groupId]
  );
  return rows;
}

// Check if user is member of group
export async function isGroupMember(groupId, userId) {
  const [rows] = await pool.query(
    `SELECT id FROM group_members
     WHERE group_id = ? AND user_id = ?
     LIMIT 1`,
    [groupId, userId]
  );
  return rows.length > 0;
}

// Update group info
export async function updateGroup(groupId, name, description) {
  const [result] = await pool.query(
    `UPDATE \`groups\` SET name = ?, description = ?
     WHERE id = ?`,
    [name, description || null, groupId]
  );
  return result.affectedRows > 0;
}

// Delete group
export async function deleteGroup(groupId) {
  const [result] = await pool.query(
    `DELETE FROM \`groups\` WHERE id = ?`,
    [groupId]
  );
  return result.affectedRows > 0;
}

// Send group message
export async function createGroupMessage(groupId, senderId, messageBody, imageUrl = null) {
  const [result] = await pool.query(
    `INSERT INTO messages (group_id, sender_id, message_body, image_url, is_group_message)
     VALUES (?, ?, ?, ?, 1)`,
    [groupId, senderId, messageBody || null, imageUrl || null]
  );
  return result.insertId;
}

// Get group messages with pagination
export async function listGroupMessages(groupId, limit = 50, offset = 0) {
  const [rows] = await pool.query(
    `SELECT m.id, m.group_id as groupId, m.sender_id as senderId, m.message_body as messageBody, 
            m.image_url as imageUrl, m.created_at as createdAt,
            u.name as senderName, u.role as senderRole
     FROM messages m
     INNER JOIN users u ON u.id = m.sender_id
     WHERE m.group_id = ? AND m.is_group_message = 1
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [groupId, limit, offset]
  );
  return rows.reverse();
}

// Mark group message as read for user
export async function markGroupMessageRead(groupId, messageId, userId) {
  const [result] = await pool.query(
    `DELETE FROM group_message_unread
     WHERE group_id = ? AND message_id = ? AND user_id = ?`,
    [groupId, messageId, userId]
  );
  return result.affectedRows;
}

// Get unread messages in group for user
export async function getUnreadGroupMessages(groupId, userId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as unreadCount
     FROM group_message_unread
     WHERE group_id = ? AND user_id = ?`,
    [groupId, userId]
  );
  return rows[0]?.unreadCount || 0;
}

// Add unread message entry for all group members except sender
export async function markGroupMessageUnreadForMembers(groupId, messageId, senderId) {
  const [members] = await pool.query(
    `SELECT user_id FROM group_members
     WHERE group_id = ? AND user_id <> ?`,
    [groupId, senderId]
  );

  if (members.length === 0) return;

  const values = members.map(m => [groupId, m.user_id, messageId]).flat();
  const placeholders = members.map(() => "(?, ?, ?)").join(",");

  await pool.query(
    `INSERT INTO group_message_unread (group_id, user_id, message_id)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`,
    values
  );
}

// Get total unread count across all groups for user
export async function getTotalGroupUnreadCount(userId) {
  const [rows] = await pool.query(
    `SELECT COUNT(DISTINCT group_id) as groupsWithUnread, COUNT(*) as totalUnread
     FROM group_message_unread
     WHERE user_id = ?`,
    [userId]
  );
  return rows[0] || { groupsWithUnread: 0, totalUnread: 0 };
}

// Get unread groups for user
export async function getUnreadGroupsForUser(userId) {
  const [rows] = await pool.query(
    `SELECT g.id, g.name, COUNT(gmu.id) as unreadCount
     FROM \`groups\` g
     INNER JOIN group_message_unread gmu ON gmu.group_id = g.id
     WHERE gmu.user_id = ?
     GROUP BY g.id
     ORDER BY g.updated_at DESC`,
    [userId]
  );
  return rows;
}
