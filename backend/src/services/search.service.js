import { pool } from "../config/db.js";

export async function globalSearch(query) {
  const searchTerm = `%${query}%`;
  
  const [users] = await pool.query(
    "SELECT id, name, email, role, 'user' as type FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 5",
    [searchTerm, searchTerm]
  );

  const [leads] = await pool.query(
    "SELECT id, title as name, status, 'lead' as type FROM leads WHERE title LIKE ? LIMIT 5",
    [searchTerm]
  );

  const [companies] = await pool.query(
    "SELECT id, name, status, 'vendor' as type FROM companies WHERE name LIKE ? OR business_email LIKE ? LIMIT 5",
    [searchTerm, searchTerm]
  );

  return [...users, ...leads, ...companies];
}
