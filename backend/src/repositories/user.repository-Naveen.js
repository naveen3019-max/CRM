import { pool } from "../config/db.js";
import { expandChatRoles } from "../utils/roleUtils.js";

let _serviceCategoryChecked = false;
let _isOnlineChecked = false;
let _lastSeenChecked = false;
let _lastSeenAvailable = false;

async function ensureServiceCategoryColumnExists() {
  if (_serviceCategoryChecked) return;
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = current_schema() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'service_category'"
    );
    const cnt = rows && rows[0] && rows[0].cnt ? Number(rows[0].cnt) : 0;
    if (cnt === 0) {
      try {
        await pool.query("ALTER TABLE users ADD COLUMN service_category VARCHAR(255) NULL");
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
    const { rows } = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = current_schema() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_online'"
    );
    const cnt = rows && rows[0] && rows[0].cnt ? Number(rows[0].cnt) : 0;
    if (cnt === 0) {
      try {
        await pool.query("ALTER TABLE users ADD COLUMN is_online BOOLEAN NOT NULL DEFAULT false");
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
    const { rows } = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = current_schema() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_seen'"
    );
    const cnt = rows && rows[0] && rows[0].cnt ? Number(rows[0].cnt) : 0;
    if (cnt === 0) {
      try {
        await pool.query("ALTER TABLE users ADD COLUMN last_seen TIMESTAMP NULL DEFAULT NULL");
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
  const { rows } = await pool.query(
    `SELECT id, name, email, role, phone, mobile, state, city, pincode, experience, about, skills, work_type, profile_completed, password_hash AS "passwordHash", is_active AS "isActive",
            service_category, preferred_language AS "preferredLanguage", created_at AS "createdAt"
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function findUserWithPasswordById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, phone, mobile, state, city, pincode, experience, about, skills, work_type, profile_completed, password_hash AS "passwordHash", is_active AS "isActive",
            service_category, preferred_language AS "preferredLanguage", created_at AS "createdAt"
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, phone, mobile, state, city, pincode, experience, about, skills, work_type, service_category, preferred_language AS "preferredLanguage", profile_completed, is_active AS "isActive", created_at AS "createdAt"
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findUserByMobile(mobile) {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, mobile, phone, state, city, pincode, experience, about, skills, work_type, profile_completed, password_hash AS "passwordHash", is_active AS "isActive",
            service_category, preferred_language AS "preferredLanguage", created_at AS "createdAt"
     FROM users
     WHERE mobile = $1
     LIMIT 1`,
    [mobile]
  );
  return rows[0] || null;
}

export async function createUser({ name, email, passwordHash, role, mobile, workType, serviceCategory, preferredLanguage = "en" }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, mobile, work_type, service_category, preferred_language)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [name, email, passwordHash, role, mobile, workType || null, serviceCategory || null, preferredLanguage || "en"]
  );
  return rows[0].id;
}

export async function listAllUsers() {
  await ensureServiceCategoryColumnExists();
  const { rows } = await pool.query(
    `SELECT id, name, email, role, phone, mobile, is_active AS "isActive", created_at AS "createdAt",
            COALESCE(service_category, work_type) AS "serviceCategory", city, experience
     FROM users
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function updateUserRoleById(id, role) {
  const result = await pool.query(
    `UPDATE users
     SET role = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [role, id]
  );
  return result.rowCount > 0;
}

export async function listUsersByRoles(roles = [], excludedUserId = null) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return [];
  }

  const expandedRoles = expandChatRoles(roles);
  const placeholders = expandedRoles.map((_, i) => `$${i + 1}`).join(", ");
  const values = [...expandedRoles];
  let query =
    `SELECT id, name, email, role, phone, mobile, is_active AS "isActive", created_at AS "createdAt"
     FROM users
     WHERE role IN (${placeholders}) AND is_active = true`;

  if (excludedUserId) {
    values.push(excludedUserId);
    query += ` AND id <> $${values.length}`;
  }

  query += " ORDER BY name ASC";

  const { rows } = await pool.query(query, values);
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

  const expandedRoles = expandChatRoles(roles);
  const queryParts = ["u.role IN (" + expandedRoles.map((_, i) => `$${i + 1}`).join(", ") + ")"];
  const values = [...expandedRoles];

  if (excludedUserId) {
    values.push(excludedUserId);
    queryParts.push(`u.id <> $${values.length}`);
  }

  // Handle explicit city filter
  if (city) {
    values.push(`%${city.toLowerCase()}%`);
    queryParts.push(`LOWER(COALESCE(u.city, '')) LIKE $${values.length}`);
  }

  // Handle explicit pincode filter
  if (pincode) {
    values.push(`%${pincode.toLowerCase()}%`);
    queryParts.push(`LOWER(COALESCE(u.pincode, '')) LIKE $${values.length}`);
  }

  // Handle explicit experience filter (handles ranges like "1+", "3+", etc.)
  if (experience) {
    const expParts = [];
    
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
        values.push(num);
        expParts.push(`u.experience >= $${values.length}`);
      }
    }
    
    if (expParts.length > 0) {
      queryParts.push("(" + expParts.join(" OR ") + ")");
    }
  }

  // Handle explicit service_category filter
  if (service_category) {
    const catTerm = `%${service_category.toLowerCase()}%`;
    values.push(catTerm, catTerm);
    queryParts.push(`(LOWER(COALESCE(u.service_category, '')) LIKE $${values.length - 1} OR LOWER(COALESCE(u.work_type, '')) LIKE $${values.length})`);
  }

  if (location) {
    const locationTerm = `%${location.toLowerCase()}%`;
    values.push(locationTerm, locationTerm, locationTerm, locationTerm, locationTerm);
    queryParts.push(`(LOWER(COALESCE(u.state, '')) LIKE $${values.length - 4} OR LOWER(COALESCE(u.city, '')) LIKE $${values.length - 3} OR LOWER(COALESCE(u.pincode, '')) LIKE $${values.length - 2} OR LOWER(COALESCE(u.service_category, '')) LIKE $${values.length - 1} OR LOWER(COALESCE(u.work_type, '')) LIKE $${values.length})`);
  }

  if (term && !location) {
    const termValue = `%${term.toLowerCase()}%`;
    values.push(termValue, termValue, termValue, termValue, termValue, termValue, termValue, termValue, termValue);
    queryParts.push(`(LOWER(u.name) LIKE $${values.length - 8} OR LOWER(COALESCE(u.email, '')) LIKE $${values.length - 7} OR LOWER(COALESCE(u.state, '')) LIKE $${values.length - 6} OR LOWER(COALESCE(u.city, '')) LIKE $${values.length - 5} OR LOWER(COALESCE(u.pincode, '')) LIKE $${values.length - 4} OR LOWER(COALESCE(u.service_category, '')) LIKE $${values.length - 3} OR LOWER(COALESCE(u.work_type, '')) LIKE $${values.length - 2} OR LOWER(COALESCE(u.skills, '')) LIKE $${values.length - 1} OR LOWER(COALESCE(u.about, '')) LIKE $${values.length})`);
  }

  values.push(Number(limit) || 10);

  // Build SELECT with/without last_seen depending on availability
  const selectFields = [
    "u.id",
    "u.name",
    "u.role",
    "TRIM(CONCAT_WS(', ', NULLIF(u.service_category, ''), NULLIF(u.city, ''), NULLIF(u.state, ''), NULLIF(u.pincode, ''))) AS location",
    "COALESCE(u.service_category, u.work_type) AS \"serviceCategory\"",
    "u.state",
    "u.city",
    "u.pincode",
    "u.experience",
    "u.about",
    "u.skills",
    "COALESCE(u.is_online, false) AS \"isOnline\""
  ];

  if (_lastSeenAvailable) {
    selectFields.push("u.last_seen AS \"lastSeen\"");
  }

  const orderExpr = _lastSeenAvailable ? "COALESCE(CAST(u.is_online AS integer), 0) DESC, u.last_seen DESC, u.name ASC" : "COALESCE(CAST(u.is_online AS integer), 0) DESC, u.created_at DESC, u.name ASC";

  const { rows } = await pool.query(
    `SELECT ${selectFields.join(",\n       ")}
     FROM users u
     WHERE ${queryParts.join(" AND ")}
     ORDER BY ${orderExpr}
     LIMIT $${values.length}`,
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
    values.push(name);
    updates.push(`name = $${values.length}`);
  }

  if (phone !== undefined) {
    values.push(phone || null);
    updates.push(`phone = $${values.length}`);
  }

  if (payload && Object.prototype.hasOwnProperty.call(payload, "mobile")) {
    values.push(mobile || null);
    updates.push(`mobile = $${values.length}`);
  }

  if (state !== undefined) {
    values.push(state || null);
    updates.push(`state = $${values.length}`);
  }

  if (city !== undefined) {
    values.push(city || null);
    updates.push(`city = $${values.length}`);
  }

  if (pincode !== undefined) {
    values.push(pincode || null);
    updates.push(`pincode = $${values.length}`);
  }

  if (experience !== undefined) {
    values.push(experience || null);
    updates.push(`experience = $${values.length}`);
  }

  if (about !== undefined) {
    values.push(about || null);
    updates.push(`about = $${values.length}`);
  }

  if (skills !== undefined) {
    values.push(skills || null);
    updates.push(`skills = $${values.length}`);
  }

  if (workType !== undefined) {
    values.push(workType || null);
    updates.push(`work_type = $${values.length}`);
  }
  // Keep service_category in sync when workType is provided
  if (workType !== undefined) {
    values.push(workType || null);
    updates.push(`service_category = $${values.length}`);
  }

  if (preferredLanguage !== undefined) {
    values.push(preferredLanguage || "en");
    updates.push(`preferred_language = $${values.length}`);
  }

  if (profileCompleted !== undefined) {
    values.push(profileCompleted ? 1 : 0);
    updates.push(`profile_completed = $${values.length}`);
  }

  if (passwordHash) {
    values.push(passwordHash);
    updates.push(`password_hash = $${values.length}`);
  }

  if (!updates.length) {
    return false;
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE users
     SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length}`,
    values
  );

  return result.rowCount > 0;
}

export async function updateVerificationToken(id, verificationToken, expiresAt) {
  const result = await pool.query(
    `UPDATE users
     SET verification_token = $1, verification_token_expires_at = $2, verification_attempts = 0, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [verificationToken, expiresAt, id]
  );
  return result.rowCount > 0;
}

export async function findUserByVerificationToken(token) {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, verification_token_expires_at AS "expiresAt", email_verified AS "emailVerified"
     FROM users
     WHERE verification_token = $1 AND verification_token_expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

export async function markEmailAsVerified(id) {
  const result = await pool.query(
    `UPDATE users
     SET email_verified = true, verification_token = NULL, verification_token_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id]
  );
  return result.rowCount > 0;
}
