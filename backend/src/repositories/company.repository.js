import { pool } from "../config/db.js";

export async function createCompany(data) {
  const [result] = await pool.query(
    "INSERT INTO companies (name, email, password_hash) VALUES (?, ?, ?)",
    [data.name, data.email, data.passwordHash]
  );
  return result.insertId;
}

export async function findCompanyByEmail(email) {
  const [rows] = await pool.query("SELECT * FROM companies WHERE email = ?", [email]);
  return rows[0];
}

export async function findCompanyById(id) {
  const [rows] = await pool.query("SELECT * FROM companies WHERE id = ?", [id]);
  return rows[0];
}

export async function findCompanyByUserId(userId) {
  const [rows] = await pool.query("SELECT * FROM companies WHERE user_id = ?", [userId]);
  return rows[0];
}

export async function updateCompanyInfo(id, data) {
  await pool.query(
    `UPDATE companies SET 
      service_type = ?, 
      description = ?, 
      years_of_experience = ?, 
      address = ?, 
      city = ?, 
      state = ?, 
      pincode = ?, 
      phone = ?, 
      alternate_phone = ?, 
      business_email = ?, 
      website = ?,
      status = 'pending'
    WHERE id = ?`,
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
  const [result] = await pool.query(
    "INSERT INTO companies (user_id, name, email) VALUES (?, ?, ?)",
    [data.userId, data.name, data.email]
  );
  return result.insertId;
}

export async function saveCompanyDocument(companyId, docType, fileUrl, fileName) {
  await pool.query(
    "INSERT INTO company_documents (company_id, doc_type, file_url, file_name) VALUES (?, ?, ?, ?)",
    [companyId, docType, fileUrl, fileName]
  );
}

export async function getCompanyDocuments(companyId) {
  const [rows] = await pool.query("SELECT * FROM company_documents WHERE company_id = ?", [companyId]);
  return rows;
}

export async function getAllCompanies() {
  const [rows] = await pool.query("SELECT id, user_id, name, email, industry, status, created_at FROM companies ORDER BY created_at DESC");
  return rows;
}

export async function updateCompanyStatus(id, status, reason = null) {
  await pool.query(
    "UPDATE companies SET status = ?, rejection_reason = ? WHERE id = ?",
    [status, reason, id]
  );
}
