import { pool } from "../config/db.js";

export async function createTaskRecord(payload) {
  const [result] = await pool.query(
    `INSERT INTO tasks (title, description, lead_id, project_order_id, assigned_to, role_type, status, due_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.title,
      payload.description || null,
      payload.leadId || null,
      payload.projectOrderId || null,
      payload.assignedTo,
      payload.roleType,
      payload.status,
      payload.dueDate || null,
      payload.createdBy
    ]
  );
  return result.insertId;
}

export async function listTaskRecords({ assignedTo, roleType, status }) {
  const conditions = [];
  const values = [];

  if (assignedTo) {
    conditions.push("t.assigned_to = ?");
    values.push(assignedTo);
  }
  if (roleType) {
    conditions.push("t.role_type = ?");
    values.push(roleType);
  }
  if (status) {
    conditions.push("t.status = ?");
    values.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT t.id, t.title, t.description, t.lead_id AS leadId, t.project_order_id AS projectOrderId,
            t.assigned_to AS assignedTo, t.role_type AS roleType, t.status, t.due_date AS dueDate,
            t.created_at AS createdAt, t.updated_at AS updatedAt,
            u.name AS assigneeName
     FROM tasks t
     INNER JOIN users u ON u.id = t.assigned_to
     ${whereClause}
     ORDER BY t.created_at DESC`,
    values
  );

  return rows;
}

export async function findTaskById(taskId) {
  const [rows] = await pool.query(
    `SELECT id, title, assigned_to AS assignedTo, status
     FROM tasks
     WHERE id = ?
     LIMIT 1`,
    [taskId]
  );
  return rows[0] || null;
}

export async function updateTaskStatusRecord(taskId, status) {
  const [result] = await pool.query(
    `UPDATE tasks
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, taskId]
  );
  return result.affectedRows > 0;
}

export async function addTaskUpdateRecord({ taskId, updatedBy, status, note, proofImageUrl }) {
  const [result] = await pool.query(
    `INSERT INTO task_updates (task_id, updated_by, status, note, proof_image_url)
     VALUES (?, ?, ?, ?, ?)`,
    [taskId, updatedBy, status || null, note || null, proofImageUrl || null]
  );
  return result.insertId;
}
