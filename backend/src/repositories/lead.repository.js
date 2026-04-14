import { pool } from "../config/db.js";

export async function createLeadRecord(payload) {
  const [result] = await pool.query(
    `INSERT INTO leads (customer_id, assigned_sales_id, status, source, title, budget, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.customerId,
      payload.assignedSalesId || null,
      payload.status,
      payload.source,
      payload.title,
      payload.budget || null,
      payload.createdBy
    ]
  );
  return result.insertId;
}

export async function listLeadRecords({ assignedSalesId, customerId, status, q, limit, offset }) {
  const conditions = [];
  const values = [];

  if (assignedSalesId) {
    conditions.push("l.assigned_sales_id = ?");
    values.push(assignedSalesId);
  }
  if (customerId) {
    conditions.push("l.customer_id = ?");
    values.push(customerId);
  }
  if (status) {
    conditions.push("l.status = ?");
    values.push(status);
  }
  if (q) {
    conditions.push("(l.title LIKE ? OR c.name LIKE ? OR c.email LIKE ?)");
    const term = `%${q}%`;
    values.push(term, term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT l.id, l.customer_id AS customerId, l.assigned_sales_id AS assignedSalesId,
            l.status, l.source, l.title, l.budget, l.created_at AS createdAt, l.updated_at AS updatedAt,
            c.name AS customerName, c.email AS customerEmail,
            s.name AS salesName
     FROM leads l
     INNER JOIN users c ON c.id = l.customer_id
     LEFT JOIN users s ON s.id = l.assigned_sales_id
     ${whereClause}
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return rows;
}

export async function findLeadById(leadId) {
  const [rows] = await pool.query(
    `SELECT id, customer_id AS customerId, assigned_sales_id AS assignedSalesId, status, source, title,
            budget, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt
     FROM leads
     WHERE id = ?
     LIMIT 1`,
    [leadId]
  );
  return rows[0] || null;
}

export async function updateLeadRecord(leadId, fields) {
  const updates = [];
  const values = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (!updates.length) {
    return false;
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  const [result] = await pool.query(
    `UPDATE leads SET ${updates.join(", ")} WHERE id = ?`,
    [...values, leadId]
  );
  return result.affectedRows > 0;
}

export async function deleteLeadRecord(leadId) {
  const [result] = await pool.query("DELETE FROM leads WHERE id = ?", [leadId]);
  return result.affectedRows > 0;
}

export async function addLeadNote({ leadId, salesId, note, followUpAt }) {
  const [result] = await pool.query(
    `INSERT INTO lead_notes (lead_id, sales_id, note, follow_up_at)
     VALUES (?, ?, ?, ?)`,
    [leadId, salesId, note, followUpAt || null]
  );
  return result.insertId;
}

export async function assignLeadToSales(leadId, salesId) {
  const [result] = await pool.query(
    `UPDATE leads
     SET assigned_sales_id = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [salesId, leadId]
  );
  return result.affectedRows > 0;
}
