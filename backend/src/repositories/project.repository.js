import { pool } from "../config/db.js";

export async function createProjectOrderRecord(payload) {
  const { rows } = await pool.query(
    `INSERT INTO projects_orders (lead_id, customer_id, vendor_id, status, total_amount, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      payload.leadId || null,
      payload.customerId,
      payload.vendorId || null,
      payload.status,
      payload.totalAmount || null,
      payload.startDate || null,
      payload.endDate || null
    ]
  );
  return rows[0].id;
}

export async function listProjectOrderRecords({ customerId, vendorId, status }) {
  const conditions = [];
  const values = [];

  if (customerId) {
    values.push(customerId);
    conditions.push(`p.customer_id = $${values.length}`);
  }
  if (vendorId) {
    values.push(vendorId);
    conditions.push(`p.vendor_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`p.status = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `SELECT p.id, p.lead_id AS "leadId", p.customer_id AS "customerId", p.vendor_id AS "vendorId",
            p.status, p.total_amount AS "totalAmount", p.start_date AS "startDate", p.end_date AS "endDate",
            p.created_at AS "createdAt", p.updated_at AS "updatedAt",
            c.name AS "customerName", v.name AS "vendorName"
     FROM projects_orders p
     INNER JOIN users c ON c.id = p.customer_id
     LEFT JOIN users v ON v.id = p.vendor_id
     ${whereClause}
     ORDER BY p.created_at DESC`,
    values
  );
  return rows;
}

export async function updateProjectOrderRecord(projectId, fields) {
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
  values.push(projectId);

  const result = await pool.query(
    `UPDATE projects_orders
     SET ${updates.join(", ")}
     WHERE id = $${values.length}`,
    values
  );

  return result.rowCount > 0;
}
