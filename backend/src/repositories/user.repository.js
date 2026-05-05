import { pool } from "../config/db.js";

export async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, phone, mobile, address, password_hash AS passwordHash, is_active AS isActive,
            created_at AS createdAt
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function findUserWithPasswordById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, phone, mobile, address, password_hash AS passwordHash, is_active AS isActive,
            created_at AS createdAt
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, phone, mobile, address, is_active AS isActive, created_at AS createdAt
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findUserByMobile(mobile) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, mobile, address, password_hash AS passwordHash, is_active AS isActive,
            created_at AS createdAt
     FROM users
     WHERE mobile = ?
     LIMIT 1`,
    [mobile]
  );
  return rows[0] || null;
}

export async function createUser({ name, email, passwordHash, role, mobile, address }) {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, mobile, address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email, passwordHash, role, mobile, address]
  );
  return result.insertId;
}

export async function listAllUsers() {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, phone, mobile, address, is_active AS isActive, created_at AS createdAt
     FROM users
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function updateUserRoleById(id, role) {
  const [result] = await pool.query(
    `UPDATE users
     SET role = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [role, id]
  );
  return result.affectedRows > 0;
}

export async function listUsersByRoles(roles = [], excludedUserId = null) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return [];
  }

  const placeholders = roles.map(() => "?").join(", ");
  const values = [...roles];
  let query =
    `SELECT id, name, email, role, phone, mobile, address, is_active AS isActive, created_at AS createdAt
     FROM users
     WHERE role IN (${placeholders}) AND is_active = 1`;

  if (excludedUserId) {
    query += " AND id <> ?";
    values.push(excludedUserId);
  }

  query += " ORDER BY name ASC";

  const [rows] = await pool.query(query, values);
  return rows;
}

export async function searchUsersByRoles({ roles = [], excludedUserId = null, location = "", term = "", limit = 10 }) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return [];
  }

  const queryParts = ["u.role IN (" + roles.map(() => "?").join(", ") + ")"];
  const values = [...roles];

  if (excludedUserId) {
    queryParts.push("u.id <> ?");
    values.push(excludedUserId);
  }

  if (location) {
    queryParts.push("LOWER(COALESCE(u.location, '')) LIKE ?");
    values.push(`%${location.toLowerCase()}%`);
  }

  if (term && !location) {
    queryParts.push("(LOWER(u.name) LIKE ? OR LOWER(COALESCE(u.location, '')) LIKE ?)");
    values.push(`%${term.toLowerCase()}%`, `%${term.toLowerCase()}%`);
  }

  values.push(Number(limit) || 10);

  const [rows] = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.role,
       COALESCE(u.address, '') AS location,
       COALESCE(u.is_online, 0) AS isOnline,
       u.last_seen AS lastSeen
     FROM users u
     WHERE ${queryParts.join(" AND ")}
     ORDER BY COALESCE(u.is_online, 0) DESC, u.last_seen DESC, u.name ASC
     LIMIT ?`,
    values
  );

  return rows;
}

export async function updateUserProfileById(id, payload) {
  const updates = [];
  const values = [];

  const { name, phone, mobile, address, passwordHash } = payload || {};

  if (typeof name === "string") {
    updates.push("name = ?");
    values.push(name);
  }

  if (phone !== undefined) {
    updates.push("phone = ?");
    values.push(phone || null);
  }

  if (payload && Object.prototype.hasOwnProperty.call(payload, "mobile")) {
    updates.push("mobile = ?");
    values.push(mobile || null);
  }

  if (payload && Object.prototype.hasOwnProperty.call(payload, "address")) {
    updates.push("address = ?");
    values.push(address || null);
  }

  if (passwordHash) {
    updates.push("password_hash = ?");
    values.push(passwordHash);
  }

  if (!updates.length) {
    return false;
  }

  values.push(id);
  const [result] = await pool.query(
    `UPDATE users
     SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    values
  );

  return result.affectedRows > 0;
}

export async function updateVerificationToken(id, verificationToken, expiresAt) {
  const [result] = await pool.query(
    `UPDATE users
     SET verification_token = ?, verification_token_expires_at = ?, verification_attempts = 0, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [verificationToken, expiresAt, id]
  );
  return result.affectedRows > 0;
}

export async function findUserByVerificationToken(token) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, verification_token_expires_at AS expiresAt, email_verified AS emailVerified
     FROM users
     WHERE verification_token = ? AND verification_token_expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

export async function markEmailAsVerified(id) {
  const [result] = await pool.query(
    `UPDATE users
     SET email_verified = 1, verification_token = NULL, verification_token_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}
