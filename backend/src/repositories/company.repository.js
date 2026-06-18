import { pool } from "../config/db.js";

let companyUserIdColumnChecked = false;
let companyUserIdColumnExists = false;
let companyOnboardingColumnsChecked = false;
let companyDocumentColumnsChecked = false;

async function ensureCompanyOnboardingColumns() {
  if (companyOnboardingColumnsChecked) {
    return;
  }

  const columnsToEnsure = [
    ["user_id", "BIGINT NULL"],
    ["service_type", "VARCHAR(255)"],
    ["description", "TEXT"],
    ["years_of_experience", "INT"],
    ["city", "VARCHAR(100)"],
    ["state", "VARCHAR(100)"],
    ["pincode", "VARCHAR(10)"],
    ["alternate_phone", "VARCHAR(20)"],
    ["business_email", "VARCHAR(255)"],
    ["website", "VARCHAR(255)"]
  ];

  try {
    const { rows } = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = current_schema() AND TABLE_NAME = 'companies'"
    );
    const existingColumns = new Set((rows || []).map((row) => row.column_name));

    for (const [columnName, definition] of columnsToEnsure) {
      if (existingColumns.has(columnName)) {
        continue;
      }

      try {
        await pool.query(`ALTER TABLE companies ADD COLUMN ${columnName} ${definition}`);
      } catch (err) {
        if (err?.code !== "42701") {
          throw err;
        }
      }
    }
  } catch (err) {
    // If schema inspection fails, let the write query report the real error.
  }

  companyOnboardingColumnsChecked = true;
}

async function ensureCompanyUserIdColumnState() {
  if (companyUserIdColumnChecked) {
    return companyUserIdColumnExists;
  }

  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = current_schema() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'user_id'"
    );
    companyUserIdColumnExists = Number(rows?.[0]?.cnt || 0) > 0;
  } catch (err) {
    companyUserIdColumnExists = false;
  }

  companyUserIdColumnChecked = true;
  return companyUserIdColumnExists;
}

async function ensureCompanyDocumentColumns() {
  if (companyDocumentColumnsChecked) {
    return;
  }

  const columnsToEnsure = [
    ["public_id", "VARCHAR(255) NULL"],
    ["mime_type", "VARCHAR(100) NULL"],
    ["file_size", "INT NULL"],
    ["file_data", "BYTEA NULL"],
    ["updated_at", "TIMESTAMP NULL DEFAULT NULL"]
  ];

  try {
    const { rows } = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = current_schema() AND TABLE_NAME = 'company_documents'"
    );
    const existingColumns = new Set((rows || []).map((row) => row.column_name));

    for (const [columnName, definition] of columnsToEnsure) {
      if (existingColumns.has(columnName)) {
        continue;
      }

      try {
        await pool.query(`ALTER TABLE company_documents ADD COLUMN ${columnName} ${definition}`);
      } catch (err) {
        if (err?.code !== "42701") {
          throw err;
        }
      }
    }
  } catch {
    // Ignore schema inspection issues and let writes fail normally if the table is unavailable.
  }

  companyDocumentColumnsChecked = true;
}

export async function createCompany(data) {
  const { rows } = await pool.query(
    "INSERT INTO companies (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
    [data.name, data.email, data.passwordHash]
  );
  return rows[0].id;
}

export async function findCompanyByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM companies WHERE email = $1", [email]);
  return rows[0];
}

export async function findCompanyById(id) {
  const { rows } = await pool.query("SELECT * FROM companies WHERE id = $1", [id]);
  return rows[0];
}

export async function findCompanyByUserId(userId) {
  const hasUserIdColumn = await ensureCompanyUserIdColumnState();
  if (!hasUserIdColumn) {
    return null;
  }

  const { rows } = await pool.query("SELECT * FROM companies WHERE user_id = $1", [userId]);
  return rows[0];
}

export async function linkCompanyToUserId(companyId, userId) {
  const hasUserIdColumn = await ensureCompanyUserIdColumnState();
  if (!hasUserIdColumn) {
    return;
  }

  await pool.query(
    `UPDATE companies
     SET user_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [userId, companyId]
  );
}

export async function updateCompanyInfo(id, data) {
  await ensureCompanyOnboardingColumns();

  await pool.query(
    `UPDATE companies SET 
      service_type = $1, 
      description = $2, 
      years_of_experience = $3, 
      address = $4, 
      city = $5, 
      state = $6, 
      pincode = $7, 
      phone = $8, 
      alternate_phone = $9, 
      business_email = $10, 
      website = $11,
      status = 'pending'
    WHERE id = $12`,
    [
      data.service_type, 
      data.description, 
      data.years_of_experience, 
      data.address, 
      data.city, 
      data.state, 
      data.pincode, 
      data.phone, 
      data.alternate_phone, 
      data.business_email, 
      data.website,
      id
    ]
  );
}

export async function createCompanyProfile(data) {
  const hasUserIdColumn = await ensureCompanyUserIdColumnState();
  const query = hasUserIdColumn
    ? "INSERT INTO companies (user_id, name, email) VALUES ($1, $2, $3) RETURNING id"
    : "INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING id";
  const values = hasUserIdColumn ? [data.userId, data.name, data.email] : [data.name, data.email];

  const { rows } = await pool.query(query, values);
  return rows[0].id;
}

export async function saveCompanyDocument(companyId, docType, fileData) {
  await ensureCompanyDocumentColumns();

  const fileUrl = fileData?.url || fileData?.fileUrl || "";
  const publicId = fileData?.publicId || null;
  const mimeType = fileData?.mimeType || null;
  const fileSize = fileData?.size || null;
  const fileName = fileData?.fileName || null;
  const fileBuffer = fileData?.buffer || null;

  await pool.query(
    `INSERT INTO company_documents (company_id, doc_type, file_url, public_id, mime_type, file_size, file_name, file_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (company_id, doc_type) DO UPDATE SET
       file_url = EXCLUDED.file_url,
       public_id = EXCLUDED.public_id,
       mime_type = EXCLUDED.mime_type,
       file_size = EXCLUDED.file_size,
       file_name = EXCLUDED.file_name,
       file_data = EXCLUDED.file_data`,
    [companyId, docType, fileUrl, publicId, mimeType, fileSize, fileName, fileBuffer]
  );

  const { rows } = await pool.query(
    "SELECT id FROM company_documents WHERE company_id = $1 AND doc_type = $2",
    [companyId, docType]
  );
  return rows[0]?.id;
}

export async function getCompanyDocuments(companyId) {
  await ensureCompanyDocumentColumns();

  const { rows } = await pool.query(
    `SELECT
      id,
      company_id AS "company_id",
      doc_type,
      file_url,
      file_url AS url,
      public_id,
      mime_type,
      file_size,
      file_name,
      created_at,
      updated_at
     FROM company_documents
     WHERE company_id = $1
     ORDER BY created_at DESC`,
    [companyId]
  );
  return rows;
}

export async function getAllCompanies() {
  const { rows } = await pool.query("SELECT id, user_id, name, email, industry, status, created_at FROM companies ORDER BY created_at DESC");
  return rows;
}

export async function updateCompanyStatus(id, status, reason = null) {
  await pool.query(
    "UPDATE companies SET status = $1, rejection_reason = $2 WHERE id = $3",
    [status, reason, id]
  );
}

export async function getCompanyDocumentData(docId) {
  const { rows } = await pool.query(
    "SELECT file_data, mime_type, file_name FROM company_documents WHERE id = $1",
    [docId]
  );
  return rows[0];
}
