import { pool } from "../config/db.js";

let workAssignmentsTableReady = false;

async function ensureWorkAssignmentsTableExists() {
  if (workAssignmentsTableReady) {
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_assignments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        worker_id BIGINT UNSIGNED NOT NULL,
        assigned_by_id BIGINT UNSIGNED NOT NULL,
        customer_id BIGINT UNSIGNED NULL,
        service_title VARCHAR(255) NOT NULL,
        service_category VARCHAR(100) NULL,
        description LONGTEXT NULL,
        location VARCHAR(500) NULL,
        city VARCHAR(100) NULL,
        area_pincode VARCHAR(20) NULL,
        budget DECIMAL(12, 2) NULL,
        priority ENUM('normal', 'important', 'urgent') NOT NULL DEFAULT 'normal',
        preferred_date DATE NULL,
        preferred_time TIME NULL,
        additional_instructions LONGTEXT NULL,
        attachments_json JSON NULL,
        proof_json JSON NULL,
        status ENUM('pending', 'accepted', 'in_progress', 'completed', 'rejected') NOT NULL DEFAULT 'pending',
        worker_response_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_work_assignments_worker FOREIGN KEY (worker_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_work_assignments_assigned_by FOREIGN KEY (assigned_by_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_work_assignments_customer FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE SET NULL,
        INDEX idx_work_assignments_worker (worker_id),
        INDEX idx_work_assignments_assigned_by (assigned_by_id),
        INDEX idx_work_assignments_status (status),
        INDEX idx_work_assignments_created_at (created_at),
        INDEX idx_work_assignments_worker_status (worker_id, status)
      ) ENGINE=InnoDB
    `);

    const [columnRows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_assignments' AND COLUMN_NAME = 'proof_json'"
    );
    const proofColumnExists = columnRows && columnRows[0] && Number(columnRows[0].cnt || 0) > 0;

    if (!proofColumnExists) {
      await pool.query(`ALTER TABLE work_assignments ADD COLUMN proof_json JSON NULL AFTER attachments_json`);
    }

    workAssignmentsTableReady = true;
  } catch (error) {
    console.warn("[DB] Warning: work_assignments table may not exist:", error && error.message);
  }
}

ensureWorkAssignmentsTableExists().catch((error) => {
  console.warn("[DB] work_assignments init error:", error && error.message);
});

export async function createWorkAssignmentRecord(payload) {
  await ensureWorkAssignmentsTableExists();
  const [result] = await pool.query(
    `INSERT INTO work_assignments (
      worker_id,
      assigned_by_id,
      customer_id,
      service_title,
      service_category,
      description,
      location,
      city,
      area_pincode,
      budget,
      priority,
      preferred_date,
      preferred_time,
      additional_instructions,
      attachments_json,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.workerId,
      payload.assignedById,
      payload.customerId || null,
      payload.serviceTitle,
      payload.serviceCategory || null,
      payload.description || null,
      payload.location || null,
      payload.city || null,
      payload.areaPincode || null,
      payload.budget || null,
      payload.priority || "normal",
      payload.preferredDate || null,
      payload.preferredTime || null,
      payload.additionalInstructions || null,
      payload.attachmentsJson ? JSON.stringify(payload.attachmentsJson) : null,
      payload.status || "pending"
    ]
  );

  return result.insertId;
}

export async function findWorkAssignmentById(assignmentId) {
  await ensureWorkAssignmentsTableExists();
  const [rows] = await pool.query(
    `SELECT
      wa.id,
      wa.worker_id AS workerId,
      wa.assigned_by_id AS assignedById,
      worker.role AS workerRole,
      assigned_by.role AS assignedByRole,
      wa.customer_id AS customerId,
      wa.service_title AS serviceTitle,
      wa.service_category AS serviceCategory,
      wa.description,
      wa.location,
      wa.city,
      wa.area_pincode AS areaPincode,
      wa.budget,
      wa.priority,
      wa.preferred_date AS preferredDate,
      wa.preferred_time AS preferredTime,
      wa.additional_instructions AS additionalInstructions,
      wa.attachments_json AS attachmentsJson,
      wa.proof_json AS proofJson,
      wa.status,
      wa.worker_response_at AS workerResponseAt,
      wa.completed_at AS completedAt,
      wa.created_at AS createdAt,
      wa.updated_at AS updatedAt,
      worker.name AS workerName,
      worker.email AS workerEmail,
      assigned_by.name AS assignedByName,
      customer.name AS customerName
     FROM work_assignments wa
     INNER JOIN users worker ON worker.id = wa.worker_id
     INNER JOIN users assigned_by ON assigned_by.id = wa.assigned_by_id
     LEFT JOIN users customer ON customer.id = wa.customer_id
     WHERE wa.id = ?
     LIMIT 1`,
    [assignmentId]
  );

  return rows[0] || null;
}

export async function listWorkAssignmentsByWorker(workerId, status = null, limit = 50, offset = 0) {
  await ensureWorkAssignmentsTableExists();
  const conditions = ["wa.worker_id = ?"];
  const values = [workerId];

  if (status) {
    conditions.push("wa.status = ?");
    values.push(status);
  }

  const whereClause = conditions.join(" AND ");

  // Debug: log the built query parameters for troubleshooting
  try {
    console.debug(`[workAssignments.repo] listWorkAssignmentsByWorker workerId=${workerId} status=${status || 'all'} limit=${limit} offset=${offset}`);
  } catch (e) {
    // ignore
  }

  const [rows] = await pool.query(
    `SELECT
      wa.id,
      wa.worker_id AS workerId,
      worker.role AS workerRole,
      wa.assigned_by_id AS assignedById,
      assigned_by.role AS assignedByRole,
      wa.customer_id AS customerId,
      wa.service_title AS serviceTitle,
      wa.service_category AS serviceCategory,
      wa.description,
      wa.location,
      wa.city,
      wa.area_pincode AS areaPincode,
      wa.budget,
      wa.priority,
      wa.preferred_date AS preferredDate,
      wa.preferred_time AS preferredTime,
      wa.additional_instructions AS additionalInstructions,
      wa.attachments_json AS attachmentsJson,
      wa.proof_json AS proofJson,
      wa.status,
      wa.created_at AS createdAt,
      assigned_by.name AS assignedByName,
      customer.name AS customerName
     FROM work_assignments wa
     INNER JOIN users worker ON worker.id = wa.worker_id
     INNER JOIN users assigned_by ON assigned_by.id = wa.assigned_by_id
     LEFT JOIN users customer ON customer.id = wa.customer_id
     WHERE ${whereClause}
     ORDER BY wa.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  try {
    console.debug(`[workAssignments.repo] returned ${Array.isArray(rows) ? rows.length : 0} rows for workerId=${workerId}`);
  } catch (e) {
    // ignore
  }

  return rows;
}

export async function listWorkAssignmentsByAdmin(assignedById, status = null, limit = 50, offset = 0) {
  await ensureWorkAssignmentsTableExists();
  const conditions = ["wa.assigned_by_id = ?"];
  const values = [assignedById];

  if (status) {
    conditions.push("wa.status = ?");
    values.push(status);
  }

  const whereClause = conditions.join(" AND ");

  const [rows] = await pool.query(
    `SELECT
      wa.id,
      wa.worker_id AS workerId,
      worker.role AS workerRole,
      wa.assigned_by_id AS assignedById,
      assigned_by.role AS assignedByRole,
      wa.customer_id AS customerId,
      wa.service_title AS serviceTitle,
      wa.service_category AS serviceCategory,
      wa.description,
      wa.location,
      wa.proof_json AS proofJson,
      wa.budget,
      wa.priority,
      wa.status,
      wa.created_at AS createdAt,
      worker.name AS workerName,
      worker.email AS workerEmail,
      customer.name AS customerName
     FROM work_assignments wa
     INNER JOIN users worker ON worker.id = wa.worker_id
     LEFT JOIN users customer ON customer.id = wa.customer_id
     WHERE ${whereClause}
     ORDER BY wa.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return rows;
}

export async function listAllWorkAssignments(status = null, limit = 100, offset = 0) {
  await ensureWorkAssignmentsTableExists();
  const conditions = [];
  const values = [];

  if (status) {
    conditions.push("wa.status = ?");
    values.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT
      wa.id,
      wa.worker_id AS workerId,
      worker.role AS workerRole,
      wa.assigned_by_id AS assignedById,
      assigned_by.role AS assignedByRole,
      wa.customer_id AS customerId,
      wa.service_title AS serviceTitle,
      wa.service_category AS serviceCategory,
      wa.description,
      wa.location,
      wa.city,
      wa.area_pincode AS areaPincode,
      wa.budget,
      wa.priority,
      wa.preferred_date AS preferredDate,
      wa.preferred_time AS preferredTime,
      wa.additional_instructions AS additionalInstructions,
      wa.attachments_json AS attachmentsJson,
      wa.proof_json AS proofJson,
      wa.status,
      wa.created_at AS createdAt,
      worker.name AS workerName,
      worker.email AS workerEmail,
      assigned_by.name AS assignedByName,
      customer.name AS customerName
     FROM work_assignments wa
     INNER JOIN users worker ON worker.id = wa.worker_id
     INNER JOIN users assigned_by ON assigned_by.id = wa.assigned_by_id
     LEFT JOIN users customer ON customer.id = wa.customer_id
     ${whereClause}
     ORDER BY wa.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return rows;
}

export async function updateWorkAssignmentStatus(assignmentId, status, responseDateField = null) {
  await ensureWorkAssignmentsTableExists();
  const updates = ["status = ?"];
  const values = [status];

  if (responseDateField) {
    updates.push(`${responseDateField} = CURRENT_TIMESTAMP`);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");

  const [result] = await pool.query(
    `UPDATE work_assignments SET ${updates.join(", ")} WHERE id = ?`,
    [...values, assignmentId]
  );

  return result.affectedRows > 0;
}

export async function updateWorkAssignmentRecord(assignmentId, fields) {
  await ensureWorkAssignmentsTableExists();
  const updates = [];
  const values = [];

  for (const [key, value] of Object.entries(fields || {})) {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (!updates.length) {
    return false;
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(assignmentId);

  const [result] = await pool.query(
    `UPDATE work_assignments SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  return result.affectedRows > 0;
}
