import { pool } from "../config/db.js";

let cancelReasonColumnReady = false;

export async function ensureCancelReasonColumnExists() {
  if (cancelReasonColumnReady) {
    return;
  }

  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = current_schema() AND TABLE_NAME = 'service_requests' AND COLUMN_NAME = 'cancel_reason'"
    );
    const exists = rows && rows[0] && Number(rows[0].cnt) > 0;

    if (!exists) {
      await pool.query("ALTER TABLE service_requests ADD COLUMN cancel_reason TEXT NULL");
    }

    cancelReasonColumnReady = true;
  } catch (error) {
    console.warn("[DB] Warning: service_requests.cancel_reason may not exist:", error && error.message);
  }
}

export async function createServiceRequestRecord(payload) {
  const { rows } = await pool.query(
    `INSERT INTO service_requests (
      customer_id,
      lead_id,
      service_category,
      problem_description,
      expected_solution,
      requirement_details,
      budget,
      urgency,
      address,
      city,
      area_pincode,
      preferred_date,
      preferred_time,
      location_lat,
      location_lng,
      dynamic_answers_json,
      attachments_json,
      status,
      assigned_worker_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING id`,
    [
      payload.customerId,
      payload.leadId || null,
      payload.serviceCategory,
      payload.problemDescription,
      payload.expectedSolution,
      payload.requirementDetails,
      payload.budget || null,
      payload.urgency || "normal",
      payload.address,
      payload.city,
      payload.areaPincode,
      payload.preferredDate || null,
      payload.preferredTime || null,
      payload.locationLat ?? null,
      payload.locationLng ?? null,
      payload.dynamicAnswersJson || null,
      payload.attachmentsJson || null,
      payload.status || "submitted",
      payload.assignedWorkerId || null
    ]
  );

  return rows[0].id;
}

export async function findServiceRequestById(serviceRequestId) {
  const query = `SELECT
      sr.id,
      sr.customer_id AS "customerId",
      sr.lead_id AS "leadId",
      sr.service_category AS "serviceCategory",
      sr.problem_description AS "problemDescription",
      sr.expected_solution AS "expectedSolution",
      sr.requirement_details AS "requirementDetails",
      sr.budget,
      sr.urgency,
      sr.address,
      sr.city,
      sr.area_pincode AS "areaPincode",
      sr.preferred_date AS "preferredDate",
      sr.preferred_time AS "preferredTime",
      sr.location_lat AS "locationLat",
      sr.location_lng AS "locationLng",
      sr.dynamic_answers_json AS "dynamicAnswersJson",
      sr.attachments_json AS "attachmentsJson",
      sr.status,
      sr.assigned_worker_id AS "assignedWorkerId",
      sr.cancel_reason AS "cancelReason",
      sr.created_at AS "createdAt",
      sr.updated_at AS "updatedAt",
      c.name AS "customerName",
      c.email AS "customerEmail",
      c.mobile AS "customerMobile",
      w.name AS "assignedWorkerName"
     FROM service_requests sr
     INNER JOIN users c ON c.id = sr.customer_id
     LEFT JOIN users w ON w.id = sr.assigned_worker_id
     WHERE sr.id = $1
      LIMIT 1`;
  const fallbackQuery = `SELECT
      sr.id,
      sr.customer_id AS "customerId",
      sr.lead_id AS "leadId",
      sr.service_category AS "serviceCategory",
      sr.problem_description AS "problemDescription",
      sr.expected_solution AS "expectedSolution",
      sr.requirement_details AS "requirementDetails",
      sr.budget,
      sr.urgency,
      sr.address,
      sr.city,
      sr.area_pincode AS "areaPincode",
      sr.preferred_date AS "preferredDate",
      sr.preferred_time AS "preferredTime",
      sr.location_lat AS "locationLat",
      sr.location_lng AS "locationLng",
      sr.dynamic_answers_json AS "dynamicAnswersJson",
      sr.attachments_json AS "attachmentsJson",
      sr.status,
      sr.assigned_worker_id AS "assignedWorkerId",
      NULL AS "cancelReason",
      sr.created_at AS "createdAt",
      sr.updated_at AS "updatedAt",
      c.name AS "customerName",
      c.email AS "customerEmail",
      c.mobile AS "customerMobile",
      w.name AS "assignedWorkerName"
     FROM service_requests sr
     INNER JOIN users c ON c.id = sr.customer_id
     LEFT JOIN users w ON w.id = sr.assigned_worker_id
     WHERE sr.id = $1
     LIMIT 1`;

  try {
    const { rows } = await pool.query(query, [serviceRequestId]);
    return rows[0] || null;
  } catch (error) {
    if (error.code === "42703" && String(error.message || "").includes("cancel_reason")) {
      await ensureCancelReasonColumnExists();
      const { rows } = await pool.query(fallbackQuery, [serviceRequestId]);
      return rows[0] || null;
    }

    throw error;
  }
}

export async function listServiceRequestRecords({ actorRole, actorId, status, q, limit = 25, offset = 0 }) {
  const conditions = [];
  const values = [];

  if (actorRole === "customer") {
    values.push(actorId);
    conditions.push(`sr.customer_id = $${values.length}`);
  }

  if (actorRole === "field_work") {
    // field workers only see requests assigned to them
    values.push(actorId);
    conditions.push(`sr.assigned_worker_id = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`sr.status = $${values.length}`);
  }

  if (q) {
    const term = `%${q}%`;
    values.push(term, term, term);
    conditions.push(`(sr.service_category ILIKE $${values.length - 2} OR sr.problem_description ILIKE $${values.length - 1} OR c.name ILIKE $${values.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `SELECT
      sr.id,
      sr.customer_id AS "customerId",
      sr.lead_id AS "leadId",
      sr.service_category AS "serviceCategory",
      sr.problem_description AS "problemDescription",
      sr.expected_solution AS "expectedSolution",
      sr.requirement_details AS "requirementDetails",
      sr.budget,
      sr.urgency,
      sr.address,
      sr.city,
      sr.area_pincode AS "areaPincode",
      sr.preferred_date AS "preferredDate",
      sr.preferred_time AS "preferredTime",
      sr.attachments_json AS "attachmentsJson",
      sr.status,
      sr.assigned_worker_id AS "assignedWorkerId",
      sr.cancel_reason AS "cancelReason",
      sr.created_at AS "createdAt",
      sr.updated_at AS "updatedAt",
      c.name AS "customerName",
      c.email AS "customerEmail",
      w.name AS "assignedWorkerName"
     FROM service_requests sr
     INNER JOIN users c ON c.id = sr.customer_id
     LEFT JOIN users w ON w.id = sr.assigned_worker_id
     ${whereClause}
     ORDER BY sr.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  
  const fallbackQuery = `SELECT
      sr.id,
      sr.customer_id AS "customerId",
      sr.lead_id AS "leadId",
      sr.service_category AS "serviceCategory",
      sr.problem_description AS "problemDescription",
      sr.expected_solution AS "expectedSolution",
      sr.requirement_details AS "requirementDetails",
      sr.budget,
      sr.urgency,
      sr.address,
      sr.city,
      sr.area_pincode AS "areaPincode",
      sr.preferred_date AS "preferredDate",
      sr.preferred_time AS "preferredTime",
      sr.attachments_json AS "attachmentsJson",
      sr.status,
      sr.assigned_worker_id AS "assignedWorkerId",
      NULL AS "cancelReason",
      sr.created_at AS "createdAt",
      sr.updated_at AS "updatedAt",
      c.name AS "customerName",
      c.email AS "customerEmail",
      w.name AS "assignedWorkerName"
     FROM service_requests sr
     INNER JOIN users c ON c.id = sr.customer_id
     LEFT JOIN users w ON w.id = sr.assigned_worker_id
     ${whereClause}
     ORDER BY sr.created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

  try {
    const queryValues = [...values, Number(limit), Number(offset)];
    const { rows } = await pool.query(query, queryValues);
    return rows;
  } catch (error) {
    if (error.code === "42703" && String(error.message || "").includes("cancel_reason")) {
      await ensureCancelReasonColumnExists();
      const queryValues = [...values, Number(limit), Number(offset)];
      const { rows } = await pool.query(fallbackQuery, queryValues);
      return rows;
    }

    throw error;
  }
}

export async function updateServiceRequestRecord(serviceRequestId, fields) {
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
  values.push(serviceRequestId);

  const result = await pool.query(
    `UPDATE service_requests SET ${updates.join(", ")} WHERE id = $${values.length}`,
    values
  );

  return result.rowCount > 0;
}
