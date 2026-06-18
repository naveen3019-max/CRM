import { pool } from "../config/db.js";

let workAssignmentsTableReady = false;

export async function ensureWorkAssignmentsTableExists() {
  if (workAssignmentsTableReady) {
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_assignments (
        id BIGSERIAL PRIMARY KEY,
        worker_id BIGINT NOT NULL,
        assigned_by_id BIGINT NOT NULL,
        customer_id BIGINT NULL,
        service_title VARCHAR(255) NOT NULL,
        service_category VARCHAR(100) NULL,
        description TEXT NULL,
        location VARCHAR(500) NULL,
        city VARCHAR(100) NULL,
        area_pincode VARCHAR(20) NULL,
        budget DECIMAL(12, 2) NULL,
        priority VARCHAR(50) NOT NULL DEFAULT 'normal',
        preferred_date DATE NULL,
        preferred_time TIME NULL,
        additional_instructions TEXT NULL,
        attachments_json JSON NULL,
        proof_json JSON NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        worker_response_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_work_assignments_worker FOREIGN KEY (worker_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_work_assignments_assigned_by FOREIGN KEY (assigned_by_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_work_assignments_customer FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE SET NULL
      )
    `);

    // Indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_work_assignments_worker ON work_assignments(worker_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_work_assignments_assigned_by ON work_assignments(assigned_by_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_work_assignments_status ON work_assignments(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_work_assignments_created_at ON work_assignments(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_work_assignments_worker_status ON work_assignments(worker_id, status)`);

    const { rows: columnRows } = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = current_schema() AND TABLE_NAME = 'work_assignments' AND COLUMN_NAME = 'proof_json'"
    );
    const proofColumnExists = columnRows && columnRows[0] && Number(columnRows[0].cnt || 0) > 0;

    if (!proofColumnExists) {
      await pool.query(`ALTER TABLE work_assignments ADD COLUMN proof_json JSON NULL`);
    }

    workAssignmentsTableReady = true;
  } catch (error) {
    console.warn("[DB] Warning: work_assignments table may not exist:", error && error.message);
  }
}

export async function createWorkAssignmentRecord(payload) {
  await ensureWorkAssignmentsTableExists();
  const { rows } = await pool.query(
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
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
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

  return rows[0].id;
}

export async function findWorkAssignmentById(assignmentId) {
  await ensureWorkAssignmentsTableExists();
  const { rows } = await pool.query(
    `SELECT
      wa.id,
      wa.worker_id AS "workerId",
      wa.assigned_by_id AS "assignedById",
      worker.role AS "workerRole",
      assigned_by.role AS "assignedByRole",
      wa.customer_id AS "customerId",
      wa.service_title AS "serviceTitle",
      wa.service_category AS "serviceCategory",
      wa.description,
      wa.location,
      wa.city,
      wa.area_pincode AS "areaPincode",
      wa.budget,
      wa.priority,
      wa.preferred_date AS "preferredDate",
      wa.preferred_time AS "preferredTime",
      wa.additional_instructions AS "additionalInstructions",
      wa.attachments_json AS "attachmentsJson",
      wa.proof_json AS "proofJson",
      wa.status,
      wa.worker_response_at AS "workerResponseAt",
      wa.completed_at AS "completedAt",
      wa.created_at AS "createdAt",
      wa.updated_at AS "updatedAt",
      worker.name AS "workerName",
      worker.email AS "workerEmail",
      assigned_by.name AS "assignedByName",
      customer.name AS "customerName"
     FROM work_assignments wa
     INNER JOIN users worker ON worker.id = wa.worker_id
     INNER JOIN users assigned_by ON assigned_by.id = wa.assigned_by_id
     LEFT JOIN users customer ON customer.id = wa.customer_id
     WHERE wa.id = $1
     LIMIT 1`,
    [assignmentId]
  );

  return rows[0] || null;
}

export async function listWorkAssignmentsByWorker(workerId, status = null, limit = 50, offset = 0) {
  await ensureWorkAssignmentsTableExists();
  const conditions = ["wa.worker_id = $1"];
  const values = [workerId];

  if (status) {
    values.push(status);
    conditions.push(`wa.status = $${values.length}`);
  }

  const whereClause = conditions.join(" AND ");

  try {
    console.debug(`[workAssignments.repo] listWorkAssignmentsByWorker workerId=${workerId} status=${status || 'all'} limit=${limit} offset=${offset}`);
  } catch (e) {
  }

  values.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT
      wa.id,
      wa.worker_id AS "workerId",
      worker.role AS "workerRole",
      wa.assigned_by_id AS "assignedById",
      assigned_by.role AS "assignedByRole",
      wa.customer_id AS "customerId",
      wa.service_title AS "serviceTitle",
      wa.service_category AS "serviceCategory",
      wa.description,
      wa.location,
      wa.city,
      wa.area_pincode AS "areaPincode",
      wa.budget,
      wa.priority,
      wa.preferred_date AS "preferredDate",
      wa.preferred_time AS "preferredTime",
      wa.additional_instructions AS "additionalInstructions",
      wa.attachments_json AS "attachmentsJson",
      wa.proof_json AS "proofJson",
      wa.status,
      wa.created_at AS "createdAt",
      assigned_by.name AS "assignedByName",
      customer.name AS "customerName"
     FROM work_assignments wa
     INNER JOIN users worker ON worker.id = wa.worker_id
     INNER JOIN users assigned_by ON assigned_by.id = wa.assigned_by_id
     LEFT JOIN users customer ON customer.id = wa.customer_id
     WHERE ${whereClause}
     ORDER BY wa.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return rows;
}

export async function listWorkAssignmentsByAdmin(assignedById, status = null, limit = 50, offset = 0) {
  await ensureWorkAssignmentsTableExists();
  const conditions = ["wa.assigned_by_id = $1"];
  const values = [assignedById];

  if (status) {
    values.push(status);
    conditions.push(`wa.status = $${values.length}`);
  }

  const whereClause = conditions.join(" AND ");
  
  values.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT
      wa.id,
      wa.worker_id AS "workerId",
      worker.role AS "workerRole",
      wa.assigned_by_id AS "assignedById",
      assigned_by.role AS "assignedByRole",
      wa.customer_id AS "customerId",
      wa.service_title AS "serviceTitle",
      wa.service_category AS "serviceCategory",
      wa.description,
      wa.location,
      wa.proof_json AS "proofJson",
      wa.budget,
      wa.priority,
      wa.status,
      wa.created_at AS "createdAt",
      worker.name AS "workerName",
      worker.email AS "workerEmail",
      customer.name AS "customerName"
     FROM work_assignments wa
     INNER JOIN users worker ON worker.id = wa.worker_id
     LEFT JOIN users customer ON customer.id = wa.customer_id
     WHERE ${whereClause}
     ORDER BY wa.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return rows;
}

export async function listAllWorkAssignments(status = null, limit = 100, offset = 0) {
  await ensureWorkAssignmentsTableExists();
  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`wa.status = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  values.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT
      wa.id,
      wa.worker_id AS "workerId",
      worker.role AS "workerRole",
      wa.assigned_by_id AS "assignedById",
      assigned_by.role AS "assignedByRole",
      wa.customer_id AS "customerId",
      wa.service_title AS "serviceTitle",
      wa.service_category AS "serviceCategory",
      wa.description,
      wa.location,
      wa.city,
      wa.area_pincode AS "areaPincode",
      wa.budget,
      wa.priority,
      wa.preferred_date AS "preferredDate",
      wa.preferred_time AS "preferredTime",
      wa.additional_instructions AS "additionalInstructions",
      wa.attachments_json AS "attachmentsJson",
      wa.proof_json AS "proofJson",
      wa.status,
      wa.created_at AS "createdAt",
      worker.name AS "workerName",
      worker.email AS "workerEmail",
      assigned_by.name AS "assignedByName",
      customer.name AS "customerName"
     FROM work_assignments wa
     INNER JOIN users worker ON worker.id = wa.worker_id
     INNER JOIN users assigned_by ON assigned_by.id = wa.assigned_by_id
     LEFT JOIN users customer ON customer.id = wa.customer_id
     ${whereClause}
     ORDER BY wa.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return rows;
}

export async function updateWorkAssignmentStatus(assignmentId, status, responseDateField = null) {
  await ensureWorkAssignmentsTableExists();
  const updates = ["status = $1"];
  const values = [status];

  if (responseDateField) {
    updates.push(`${responseDateField} = CURRENT_TIMESTAMP`);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(assignmentId);

  const result = await pool.query(
    `UPDATE work_assignments SET ${updates.join(", ")} WHERE id = $${values.length}`,
    values
  );

  return result.rowCount > 0;
}

export async function updateWorkAssignmentRecord(assignmentId, fields) {
  await ensureWorkAssignmentsTableExists();
  const updates = [];
  const values = [];

  for (const [key, value] of Object.entries(fields || {})) {
    if (value !== undefined) {
      values.push(value);
      updates.push(`${key} = $${values.length}`);
    }
  }

  if (!updates.length) {
    return false;
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(assignmentId);

  const result = await pool.query(
    `UPDATE work_assignments SET ${updates.join(", ")} WHERE id = $${values.length}`,
    values
  );

  return result.rowCount > 0;
}
