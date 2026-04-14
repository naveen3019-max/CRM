import { pool } from "../config/db.js";

export async function logActivity({ actorId, action, entityType, entityId, metadata }) {
  await pool.query(
    `INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, metadata_json)
     VALUES (?, ?, ?, ?, ?)`,
    [actorId, action, entityType, entityId || null, metadata ? JSON.stringify(metadata) : null]
  );
}
