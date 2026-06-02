import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { env } from './src/config/env.js';

const adminName = process.env.ADMIN_NAME || 'Platform Admin';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@verbenatech.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe@123';
const adminRole = process.env.ADMIN_ROLE || 'admin';

const conn = await mysql.createConnection({
  host: env.dbHost,
  port: env.dbPort,
  user: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
  ssl: env.dbSsl
    ? {
        rejectUnauthorized: env.dbSslRejectUnauthorized
      }
    : undefined
});

try {
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await conn.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       password_hash = VALUES(password_hash),
       role = VALUES(role)`,
    [adminName, adminEmail, passwordHash, adminRole]
  );
  
  console.log('✅ Admin user upserted successfully.');
  console.log(`Email: ${adminEmail}`);
  console.log(`Role: ${adminRole}`);
  
  const [rows] = await conn.query(
    'SELECT id, name, email, role, password_hash, is_active FROM users WHERE email = ?',
    [adminEmail]
  );
  
  console.log('\nAdmin User Record:');
  console.log(JSON.stringify(rows[0], null, 2));
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await conn.end();
}
