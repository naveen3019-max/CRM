import { pool } from "../config/db.js";

let cancelReasonColumnReady = false;

async function ensureCancelReasonColumnExists() {
  if (cancelReasonColumnReady) {
    return;
  }

  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_requests' AND COLUMN_NAME = 'cancel_reason'"
    );
    const exists = rows && rows[0] && Number(rows[0].cnt) > 0;

    if (!exists) {
      await pool.query("ALTER TABLE service_requests ADD COLUMN cancel_reason TEXT NULL AFTER assigned_worker_id");
    }

    cancelReasonColumnReady = true;
  } catch (error) {
    console.warn("[DB] Warning: service_requests.cancel_reason may not exist:", error && error.message);
  }
}

ensureCancelReasonColumnExists().catch((error) => {
  console.warn("[DB] cancel_reason column init error:", error && error.message);
});

export async function createServiceRequestRecord(payload) {
  const [result] = await pool.query(
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  return result.insertId;
}

export async function findServiceRequestById(serviceRequestId) {
  const query = `SELECT
      sr.id,
      sr.customer_id AS customerId,
      sr.lead_id AS leadId,
      sr.service_category AS serviceCategory,
      sr.problem_description AS problemDescription,
      sr.expected_solution AS expectedSolution,
      sr.requirement_details AS requirementDetails,
      sr.budget,
      sr.urgency,
      sr.address,
      sr.city,
      sr.area_pincode AS areaPincode,
      sr.preferred_date AS preferredDate,
      sr.preferred_time AS preferredTime,
      sr.location_lat AS locationLat,
      sr.location_lng AS locationLng,
      sr.dynamic_answers_json AS dynamicAnswersJson,
      sr.attachments_json AS attachmentsJson,
      sr.status,
      sr.assigned_worker_id AS assignedWorkerId,
      sr.cancel_reason AS cancelReason,
      sr.created_at AS createdAt,
      sr.updated_at AS updatedAt,
      c.name AS customerName,
      c.email AS customerEmail,
      c.mobile AS customerMobile,
      w.name AS assignedWorkerName
     FROM service_requests sr
     INNER JOIN users c ON c.id = sr.customer_id
     LEFT JOIN users w ON w.id = sr.assigned_worker_id
     WHERE sr.id = ?
      LIMIT 1`;
  const fallbackQuery = `SELECT
      sr.id,
      sr.customer_id AS customerId,
      sr.lead_id AS leadId,
      sr.service_category AS serviceCategory,
      sr.problem_description AS problemDescription,
      sr.expected_solution AS expectedSolution,
      sr.requirement_details AS requirementDetails,
      sr.budget,
      sr.urgency,
      sr.address,
      sr.city,
      sr.area_pincode AS areaPincode,
      sr.preferred_date AS preferredDate,
      sr.preferred_time AS preferredTime,
      sr.location_lat AS locationLat,
      sr.location_lng AS locationLng,
      sr.dynamic_answers_json AS dynamicAnswersJson,
      sr.attachments_json AS attachmentsJson,
      sr.status,
      sr.assigned_worker_id AS assignedWorkerId,
      NULL AS cancelReason,
      sr.created_at AS createdAt,
      sr.updated_at AS updatedAt,
      c.name AS customerName,
      c.email AS customerEmail,
      c.mobile AS customerMobile,
      w.name AS assignedWorkerName
     FROM service_requests sr
     INNER JOIN users c ON c.id = sr.customer_id
     LEFT JOIN users w ON w.id = sr.assigned_worker_id
     WHERE sr.id = ?
     LIMIT 1`;

  try {
    const [rows] = await pool.query(query, [serviceRequestId]);
    return rows[0] || null;
  } catch (error) {
    if (error.code === "ER_BAD_FIELD_ERROR" && String(error.message || "").includes("cancel_reason")) {
      await ensureCancelReasonColumnExists();
      const [rows] = await pool.query(fallbackQuery, [serviceRequestId]);
      return rows[0] || null;
    }

    throw error;
  }
}

export async function listServiceRequestRecords({ actorRole, actorId, status, q, limit = 25, offset = 0 }) {
  const conditions = [];
  const values = [];

  if (actorRole === "customer") {
    conditions.push("sr.customer_id = ?");
    values.push(actorId);
  }

  if (actorRole === "field_work") {
    // field workers only see requests assigned to them
    conditions.push("sr.assigned_worker_id = ?");
    values.push(actorId);
  }

  if (status) {
    conditions.push("sr.status = ?");
    values.push(status);
  }

  if (q) {
    const term = `%${q}%`;
    conditions.push("(sr.service_category LIKE ? OR sr.problem_description LIKE ? OR c.name LIKE ?)");
    values.push(term, term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `SELECT
      sr.id,
      sr.customer_id AS customerId,
      sr.lead_id AS leadId,
      sr.service_category AS serviceCategory,
      sr.problem_description AS problemDescription,
      sr.expected_solution AS expectedSolution,
      sr.requirement_details AS requirementDetails,
      sr.budget,
      sr.urgency,
      sr.address,
      sr.city,
      sr.area_pincode AS areaPincode,
      sr.preferred_date AS preferredDate,
      sr.preferred_time AS preferredTime,
      sr.attachments_json AS attachmentsJson,
      sr.status,
      sr.assigned_worker_id AS assignedWorkerId,
      sr.cancel_reason AS cancelReason,
      sr.created_at AS createdAt,
      sr.updated_at AS updatedAt,
      c.name AS customerName,
      c.email AS customerEmail,
      w.name AS assignedWorkerName
     FROM service_requests sr
     INNER JOIN users c ON c.id = sr.customer_id
     LEFT JOIN users w ON w.id = sr.assigned_worker_id
     ${whereClause}
     ORDER BY sr.created_at DESC
      LIMIT ? OFFSET ?`;
  const fallbackQuery = `SELECT
      sr.id,
      sr.customer_id AS customerId,
      sr.lead_id AS leadId,
      sr.service_category AS serviceCategory,
      sr.problem_description AS problemDescription,
      sr.expected_solution AS expectedSolution,
      sr.requirement_details AS requirementDetails,
      sr.budget,
      sr.urgency,
      sr.address,
      sr.city,
      sr.area_pincode AS areaPincode,
      sr.preferred_date AS preferredDate,
      sr.preferred_time AS preferredTime,
      sr.attachments_json AS attachmentsJson,
      sr.status,
      sr.assigned_worker_id AS assignedWorkerId,
      NULL AS cancelReason,
      sr.created_at AS createdAt,
      sr.updated_at AS updatedAt,
      c.name AS customerName,
      c.email AS customerEmail,
      w.name AS assignedWorkerName
     FROM service_requests sr
     INNER JOIN users c ON c.id = sr.customer_id
     LEFT JOIN users w ON w.id = sr.assigned_worker_id
     ${whereClause}
     ORDER BY sr.created_at DESC
     LIMIT ? OFFSET ?`;

  try {
    const [rows] = await pool.query(query, [...values, Number(limit), Number(offset)]);
    return rows;
  } catch (error) {
    if (error.code === "ER_BAD_FIELD_ERROR" && String(error.message || "").includes("cancel_reason")) {
      await ensureCancelReasonColumnExists();
      const [rows] = await pool.query(fallbackQuery, [...values, Number(limit), Number(offset)]);
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
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (!updates.length) {
    return false;
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(serviceRequestId);

  const [result] = await pool.query(
    `UPDATE service_requests SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  return result.affectedRows > 0;
}
