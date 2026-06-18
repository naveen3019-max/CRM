import { pool } from "../config/db.js";

export async function createLeadRecord(payload) {
  const { rows } = await pool.query(
    `INSERT INTO leads (customer_id, assigned_sales_id, status, source, title, budget, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
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
  return rows[0].id;
}

export async function listLeadRecords({ assignedSalesId, customerId, status, q, limit, offset }) {
  const conditions = [];
  const values = [];

  if (assignedSalesId) {
    values.push(assignedSalesId);
    conditions.push(`l.assigned_sales_id = $${values.length}`);
  }
  if (customerId) {
    values.push(customerId);
    conditions.push(`l.customer_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`l.status = $${values.length}`);
  }
  if (q) {
    const term = `%${q}%`;
    values.push(term, term, term);
    conditions.push(`(l.title LIKE $${values.length - 2} OR c.name LIKE $${values.length - 1} OR c.email LIKE $${values.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  values.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT l.id, l.customer_id AS "customerId", l.assigned_sales_id AS "assignedSalesId",
            l.status, l.source, l.title, l.budget, l.created_at AS "createdAt", l.updated_at AS "updatedAt",
            c.name AS "customerName", c.email AS "customerEmail",
            s.name AS "salesName"
     FROM leads l
     INNER JOIN users c ON c.id = l.customer_id
     LEFT JOIN users s ON s.id = l.assigned_sales_id
     ${whereClause}
     ORDER BY l.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return rows;
}

export async function findLeadById(leadId) {
  const { rows } = await pool.query(
    `SELECT id, customer_id AS "customerId", assigned_sales_id AS "assignedSalesId", status, source, title,
            budget, created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM leads
     WHERE id = $1
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
      values.push(value);
      updates.push(`${key} = $${values.length}`);
    }
  });

  if (!updates.length) {
    return false;
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(leadId);
  const result = await pool.query(
    `UPDATE leads SET ${updates.join(", ")} WHERE id = $${values.length}`,
    values
  );
  return result.rowCount > 0;
}

export async function deleteLeadRecord(leadId) {
  const result = await pool.query("DELETE FROM leads WHERE id = $1", [leadId]);
  return result.rowCount > 0;
}

export async function addLeadNote({ leadId, salesId, note, followUpAt }) {
  const { rows } = await pool.query(
    `INSERT INTO lead_notes (lead_id, sales_id, note, follow_up_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [leadId, salesId, note, followUpAt || null]
  );
  return rows[0].id;
}

export async function assignLeadToSales(leadId, salesId) {
  const result = await pool.query(
    `UPDATE leads
     SET assigned_sales_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [salesId, leadId]
  );
  return result.rowCount > 0;
}
