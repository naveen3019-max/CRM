import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function stripUseStatements(sql) {
  return sql
    .replace(/CREATE DATABASE IF NOT EXISTS\s+[^;]+;/gi, "")
    .replace(/USE\s+[^;]+;/gi, "");
}

async function runSqlFile(pool, filePath) {
  const sql = await fs.readFile(filePath, "utf8");
  const sanitized = stripUseStatements(sql);
  await pool.query(sanitized);
}

async function safeQuery(pool, sql, ignoreErrorCodes = []) {
  try {
    await pool.query(sql);
  } catch (error) {
    if (ignoreErrorCodes.includes(error.code)) {
      return;
    }
    throw error;
  }
}

async function setupDatabase() {
  const adminPool = mysql.createPool({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    waitForConnections: true,
    connectionLimit: 2,
    multipleStatements: true
  });

  try {
    await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${env.dbName}\``);
  } finally {
    await adminPool.end();
  }

  const appPool = mysql.createPool({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    waitForConnections: true,
    connectionLimit: 2,
    multipleStatements: true
  });

  try {
    const migrationFile = path.resolve(__dirname, "migrations/001_init.sql");
    const seedFile = path.resolve(__dirname, "seeds/001_seed_users.sql");

    await runSqlFile(appPool, migrationFile);
    await appPool.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('admin','sales','customer','vendor','electrician','field_work') NOT NULL"
    );
    await appPool.query(
      "ALTER TABLE conversations MODIFY COLUMN scope ENUM('sales_customer','admin_sales','admin_vendor','admin_electrician','admin_field_work') NOT NULL"
    );
    await appPool.query("ALTER TABLE tasks MODIFY COLUMN role_type ENUM('vendor','electrician','field_work') NOT NULL");
    await appPool.query("ALTER TABLE messages MODIFY COLUMN message_body TEXT NULL");
    await safeQuery(appPool, "ALTER TABLE messages ADD COLUMN image_url VARCHAR(500) NULL AFTER message_body", [
      "ER_DUP_FIELDNAME"
    ]);
    await runSqlFile(appPool, seedFile);

    console.log(`Database setup completed for ${env.dbName}`);
  } finally {
    await appPool.end();
  }
}

setupDatabase().catch((error) => {
  console.error("Database setup failed", error);
  process.exit(1);
});
