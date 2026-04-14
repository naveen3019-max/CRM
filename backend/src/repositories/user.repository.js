import { pool } from "../config/db.js";

export async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, phone, password_hash AS passwordHash, is_active AS isActive,
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
    `SELECT id, name, email, role, phone, password_hash AS passwordHash, is_active AS isActive,
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
    `SELECT id, name, email, role, is_active AS isActive, created_at AS createdAt
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function createUser({ name, email, passwordHash, role }) {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, ?)`,
    [name, email, passwordHash, role]
  );
  return result.insertId;
}

export async function listAllUsers() {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, is_active AS isActive, created_at AS createdAt
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
    `SELECT id, name, email, role, is_active AS isActive, created_at AS createdAt
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

export async function updateUserProfileById(id, { name, phone, passwordHash }) {
  const updates = [];
  const values = [];

  if (typeof name === "string") {
    updates.push("name = ?");
    values.push(name);
  }

  if (phone !== undefined) {
    updates.push("phone = ?");
    values.push(phone || null);
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
