import { pool } from "../config/db.js";

let _serviceCategoryChecked = false;
let _isOnlineChecked = false;
let _lastSeenChecked = false;
let _lastSeenAvailable = false;

async function ensureServiceCategoryColumnExists() {
  if (_serviceCategoryChecked) return;
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'service_category'"
    );
    const cnt = rows && rows[0] && rows[0].cnt ? Number(rows[0].cnt) : 0;
    if (cnt === 0) {
      try {
        await pool.query("ALTER TABLE users ADD COLUMN service_category VARCHAR(255) NULL AFTER work_type");
        console.log('[DB] Added missing column `service_category` to users table');
      } catch (err) {
        console.warn('[DB] Failed to add service_category column:', err && err.message);
      }
    }
  } catch (err) {
    console.warn('[DB] Could not verify service_category column existence:', err && err.message);
  }
  _serviceCategoryChecked = true;
}

async function ensureIsOnlineColumnExists() {
  if (_isOnlineChecked) return;
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_online'"
    );
    const cnt = rows && rows[0] && rows[0].cnt ? Number(rows[0].cnt) : 0;
    if (cnt === 0) {
      try {
        await pool.query("ALTER TABLE users ADD COLUMN is_online TINYINT(1) NOT NULL DEFAULT 0 AFTER skills");
        console.log('[DB] Added missing column `is_online` to users table');
      } catch (err) {
        console.warn('[DB] Failed to add is_online column:', err && err.message);
      }
    }
  } catch (err) {
    console.warn('[DB] Could not verify is_online column existence:', err && err.message);
  }
  _isOnlineChecked = true;
}

async function ensureLastSeenColumnExists() {
  if (_lastSeenChecked) return;
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_seen'"
    );
    const cnt = rows && rows[0] && rows[0].cnt ? Number(rows[0].cnt) : 0;
    if (cnt === 0) {
      try {
        await pool.query("ALTER TABLE users ADD COLUMN last_seen TIMESTAMP NULL DEFAULT NULL AFTER is_online");
        console.log('[DB] Added missing column `last_seen` to users table');
        _lastSeenAvailable = true;
      } catch (err) {
        console.warn('[DB] Failed to add last_seen column:', err && err.message);
      }
    } else {
      _lastSeenAvailable = true;
    }
  } catch (err) {
    console.warn('[DB] Could not verify last_seen column existence:', err && err.message);
  }
  _lastSeenChecked = true;
}

export async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, phone, mobile, state, city, pincode, experience, about, skills, work_type, profile_completed, password_hash AS passwordHash, is_active AS isActive,
            service_category, preferred_language AS preferredLanguage, created_at AS createdAt
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function findUserWithPasswordById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, phone, mobile, state, city, pincode, experience, about, skills, work_type, profile_completed, password_hash AS passwordHash, is_active AS isActive,
            service_category, preferred_language AS preferredLanguage, created_at AS createdAt
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, phone, mobile, state, city, pincode, experience, about, skills, work_type, service_category, preferred_language AS preferredLanguage, profile_completed, is_active AS isActive, created_at AS createdAt
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findUserByMobile(mobile) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, mobile, phone, state, city, pincode, experience, about, skills, work_type, profile_completed, password_hash AS passwordHash, is_active AS isActive,
            service_category, preferred_language AS preferredLanguage, created_at AS createdAt
     FROM users
     WHERE mobile = ?
     LIMIT 1`,
    [mobile]
  );
  return rows[0] || null;
}

export async function createUser({ name, email, passwordHash, role, mobile, workType, serviceCategory, preferredLanguage = "en" }) {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, mobile, work_type, service_category, preferred_language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, email, passwordHash, role, mobile, workType || null, serviceCategory || null, preferredLanguage || "en"]
  );
  return result.insertId;
}

export async function listAllUsers() {
  await ensureServiceCategoryColumnExists();
  const [rows] = await pool.query(
    `SELECT id, name, email, role, phone, mobile, is_active AS isActive, created_at AS createdAt,
            COALESCE(service_category, work_type) AS serviceCategory, city, experience
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
    `SELECT id, name, email, role, phone, mobile, is_active AS isActive, created_at AS createdAt
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

export async function searchUsersByRoles({ roles = [], excludedUserId = null, location = "", term = "", city = "", pincode = "", experience = "", service_category = "", limit = 10 }) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return [];
  }

  // Ensure optional columns exist to avoid SQL errors on older schemas
  await ensureServiceCategoryColumnExists();
  await ensureIsOnlineColumnExists();
  await ensureLastSeenColumnExists();

  const queryParts = ["u.role IN (" + roles.map(() => "?").join(", ") + ")"];
  const values = [...roles];

  if (excludedUserId) {
    queryParts.push("u.id <> ?");
    values.push(excludedUserId);
  }

  // Handle explicit city filter
  if (city) {
    queryParts.push("LOWER(COALESCE(u.city, '')) LIKE ?");
    values.push(`%${city.toLowerCase()}%`);
  }

  // Handle explicit pincode filter
  if (pincode) {
    queryParts.push("LOWER(COALESCE(u.pincode, '')) LIKE ?");
    values.push(`%${pincode.toLowerCase()}%`);
  }

  // Handle explicit experience filter (handles ranges like "1+", "3+", etc.)
  if (experience) {
    const expParts = [];
    const expValues = [];
    
    if (experience.includes("fresher") || experience === "0") {
      expParts.push("u.experience = 0");
    } else if (experience.includes("1+") || experience === "1") {
      expParts.push("u.experience >= 1");
    } else if (experience.includes("3+") || experience === "3") {
      expParts.push("u.experience >= 3");
    } else if (experience.includes("5+") || experience === "5") {
      expParts.push("u.experience >= 5");
    } else {
      // Try to parse as a number
      const num = parseInt(experience, 10);
      if (!isNaN(num)) {
        expParts.push("u.experience >= ?");
        expValues.push(num);
      }
    }
    
    if (expParts.length > 0) {
      queryParts.push("(" + expParts.join(" OR ") + ")");
      values.push(...expValues);
    }
  }

  // Handle explicit service_category filter
  if (service_category) {
    queryParts.push("(LOWER(COALESCE(u.service_category, '')) LIKE ? OR LOWER(COALESCE(u.work_type, '')) LIKE ?)");
    const catTerm = `%${service_category.toLowerCase()}%`;
    values.push(catTerm, catTerm);
  }

  if (location) {
    queryParts.push("(LOWER(COALESCE(u.state, '')) LIKE ? OR LOWER(COALESCE(u.city, '')) LIKE ? OR LOWER(COALESCE(u.pincode, '')) LIKE ? OR LOWER(COALESCE(u.service_category, '')) LIKE ? OR LOWER(COALESCE(u.work_type, '')) LIKE ?)");
    const locationTerm = `%${location.toLowerCase()}%`;
    values.push(locationTerm, locationTerm, locationTerm, locationTerm, locationTerm);
  }

  if (term && !location) {
    queryParts.push("(LOWER(u.name) LIKE ? OR LOWER(COALESCE(u.email, '')) LIKE ? OR LOWER(COALESCE(u.state, '')) LIKE ? OR LOWER(COALESCE(u.city, '')) LIKE ? OR LOWER(COALESCE(u.pincode, '')) LIKE ? OR LOWER(COALESCE(u.service_category, '')) LIKE ? OR LOWER(COALESCE(u.work_type, '')) LIKE ? OR LOWER(COALESCE(u.skills, '')) LIKE ? OR LOWER(COALESCE(u.about, '')) LIKE ?)");
    const termValue = `%${term.toLowerCase()}%`;
    values.push(termValue, termValue, termValue, termValue, termValue, termValue, termValue, termValue, termValue);
  }

  values.push(Number(limit) || 10);

  // Build SELECT with/without last_seen depending on availability
  const selectFields = [
    "u.id",
    "u.name",
    "u.role",
    "TRIM(CONCAT_WS(', ', NULLIF(u.service_category, ''), NULLIF(u.city, ''), NULLIF(u.state, ''), NULLIF(u.pincode, ''))) AS location",
    "COALESCE(u.service_category, u.work_type) AS serviceCategory",
    "u.state",
    "u.city",
    "u.pincode",
    "u.experience",
    "u.about",
    "u.skills",
    "COALESCE(u.is_online, 0) AS isOnline"
  ];

  if (_lastSeenAvailable) {
    selectFields.push("u.last_seen AS lastSeen");
  }

  const orderExpr = _lastSeenAvailable ? "COALESCE(u.is_online, 0) DESC, u.last_seen DESC, u.name ASC" : "COALESCE(u.is_online, 0) DESC, u.created_at DESC, u.name ASC";

  const [rows] = await pool.query(
    `SELECT ${selectFields.join(",\n       ")}
     FROM users u
     WHERE ${queryParts.join(" AND ")}
     ORDER BY ${orderExpr}
     LIMIT ?`,
    values
  );

  return rows;
}

export async function updateUserProfileById(id, payload) {
  await ensureServiceCategoryColumnExists();
  const updates = [];
  const values = [];

  const { name, phone, mobile, passwordHash, state, city, pincode, experience, about, skills, workType, preferredLanguage, profileCompleted } = payload || {};

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

  if (state !== undefined) {
    updates.push("state = ?");
    values.push(state || null);
  }

  if (city !== undefined) {
    updates.push("city = ?");
    values.push(city || null);
  }

  if (pincode !== undefined) {
    updates.push("pincode = ?");
    values.push(pincode || null);
  }

  if (experience !== undefined) {
    updates.push("experience = ?");
    values.push(experience || null);
  }

  if (about !== undefined) {
    updates.push("about = ?");
    values.push(about || null);
  }

  if (skills !== undefined) {
    updates.push("skills = ?");
    values.push(skills || null);
  }

  if (workType !== undefined) {
    updates.push("work_type = ?");
    values.push(workType || null);
  }
  // Keep service_category in sync when workType is provided
  if (workType !== undefined) {
    updates.push("service_category = ?");
    values.push(workType || null);
  }

  if (preferredLanguage !== undefined) {
    updates.push("preferred_language = ?");
    values.push(preferredLanguage || "en");
  }

  if (profileCompleted !== undefined) {
    updates.push("profile_completed = ?");
    values.push(profileCompleted ? 1 : 0);
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
