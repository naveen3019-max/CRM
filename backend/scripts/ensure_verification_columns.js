import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

async function run() {
  const pool = mysql.createPool({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    waitForConnections: true,
    connectionLimit: 2
  });

  const queries = [
    `ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active`,
    `ALTER TABLE users ADD COLUMN verification_token VARCHAR(255) NULL AFTER email_verified`,
    `ALTER TABLE users ADD COLUMN verification_token_expires_at TIMESTAMP NULL AFTER verification_token`,
    `ALTER TABLE users ADD COLUMN verification_attempts INT NOT NULL DEFAULT 0 AFTER verification_token_expires_at`,
    `CREATE INDEX idx_users_verification_token ON users(verification_token)`
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
      console.log('Applied:', q.split('\n')[0]);
    } catch (err) {
      if (err && (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.errno === 1060)) {
        console.log('Already applied (skipping):', q.split('\n')[0]);
        continue;
      }
      console.error('Failed to apply:', q.split('\n')[0], err.message || err);
    }
  }

  await pool.end();
}

run().catch((e) => {
  console.error('Script failed', e);
  process.exit(1);
});
