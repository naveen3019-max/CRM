import { pool } from '../config/db.js';

export async function findCommunicationContext(leadId) {
  const { rows } = await pool.query(`
    SELECT 
      l.*,
      u.name as customer_name,
      u.email as customer_email,
      u.phone as customer_phone,
      s.name as sales_name,
      v.name as vendor_name
    FROM leads l
    JOIN users u ON l.customer_id = u.id
    LEFT JOIN users s ON l.assigned_sales_id = s.id
    LEFT JOIN users v ON l.assigned_vendor_id = v.id
    WHERE l.id = $1
  `, [leadId]);
  return rows[0];
}

export async function findConversationByLead(leadId) {
  const { rows } = await pool.query(
    "SELECT * FROM conversations WHERE lead_id = $1",
    [leadId]
  );
  return rows[0];
}

export async function createLeadConversation(leadId, scope, p1, p2) {
  const { rows } = await pool.query(
    "INSERT INTO conversations (lead_id, scope, participant_low_id, participant_high_id) VALUES ($1, $2, $3, $4) RETURNING id",
    [leadId, scope, Math.min(p1, p2), Math.max(p1, p2)]
  );
  return rows[0].id;
}

export async function listLeadMessages(leadId, limit = 100) {
  const { rows } = await pool.query(`
    SELECT m.*, u.name as sender_name, u.role as sender_role
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    JOIN users u ON m.sender_id = u.id
    WHERE c.lead_id = $1
    ORDER BY m.created_at ASC
    LIMIT $2
  `, [leadId, limit]);
  return rows;
}

export async function createStructuredMessage({ conversationId, senderId, receiverId, body, type, metadata }) {
  const { rows } = await pool.query(
    "INSERT INTO messages (conversation_id, sender_id, receiver_id, message_body, type, metadata_json) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    [conversationId, senderId, receiverId, body, type, JSON.stringify(metadata)]
  );
  return rows[0].id;
}

export async function updateLeadOperationalData(leadId, data) {
  const fields = [];
  const values = [];

  if (data.location_lat !== undefined) { values.push(data.location_lat); fields.push(`location_lat = $${values.length}`); }
  if (data.location_lng !== undefined) { values.push(data.location_lng); fields.push(`location_lng = $${values.length}`); }
  if (data.address_details !== undefined) { values.push(data.address_details); fields.push(`address_details = $${values.length}`); }
  if (data.scheduled_at !== undefined) { values.push(data.scheduled_at); fields.push(`scheduled_at = $${values.length}`); }
  if (data.requirement_details !== undefined) { values.push(data.requirement_details); fields.push(`requirement_details = $${values.length}`); }
  if (data.assigned_vendor_id !== undefined) { values.push(data.assigned_vendor_id); fields.push(`assigned_vendor_id = $${values.length}`); }

  if (fields.length === 0) return;

  values.push(leadId);
  await pool.query(`UPDATE leads SET ${fields.join(", ")} WHERE id = $${values.length}`, values);
}

export async function getLeadActivityLogs(leadId) {
  const { rows } = await pool.query(
    "SELECT * FROM activity_logs WHERE entity_type = 'lead' AND entity_id = $1 ORDER BY created_at DESC LIMIT 50",
    [leadId]
  );
  return rows;
}
