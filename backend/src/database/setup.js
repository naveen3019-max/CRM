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
    ssl: env.dbSsl
      ? {
          rejectUnauthorized: env.dbSslRejectUnauthorized
        }
      : undefined,
    waitForConnections: true,
    connectionLimit: 2,
    multipleStatements: true
  });

  try {
    await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${env.dbName}\``);
  } catch (error) {
    if (!["ER_DBACCESS_DENIED_ERROR", "ER_ACCESS_DENIED_ERROR"].includes(error.code)) {
      throw error;
    }

    console.warn(
      `Skipping CREATE DATABASE for ${env.dbName} due to insufficient privileges. Ensure the database already exists.`
    );
  } finally {
    await adminPool.end();
  }

  const appPool = mysql.createPool({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    ssl: env.dbSsl
      ? {
          rejectUnauthorized: env.dbSslRejectUnauthorized
        }
      : undefined,
    waitForConnections: true,
    connectionLimit: 2,
    multipleStatements: true
  });

  try {
    const migrationFile = path.resolve(__dirname, "migrations/001_init.sql");
    const onboardingMigrationFile = path.resolve(__dirname, "migrations/002_company_onboarding.sql");
    const updateFieldsMigrationFile = path.resolve(__dirname, "migrations/003_update_company_fields.sql");
    const fixPasswordMigrationFile = path.resolve(__dirname, "migrations/004_fix_company_password.sql");
    const uniqueDocsMigrationFile = path.resolve(__dirname, "migrations/005_unique_docs.sql");
    const businessCommMigrationFile = path.resolve(__dirname, "migrations/006_business_communication.sql");
    const groupChatMigrationFile = path.resolve(__dirname, "migrations/007_group_chat.sql");
    const verificationMigrationFile = path.resolve(__dirname, "migrations/008_vendor_email_verification.sql");
    const seedFile = path.resolve(__dirname, "seeds/001_seed_users.sql");

    await runSqlFile(appPool, migrationFile);
    await runSqlFile(appPool, onboardingMigrationFile);
    await safeQuery(appPool, "ALTER TABLE companies MODIFY COLUMN service_type VARCHAR(255)");
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id", ["ER_DUP_FIELDNAME"]);
    // await runSqlFile(appPool, updateFieldsMigrationFile); // Already applied
    await safeQuery(appPool, "ALTER TABLE companies MODIFY COLUMN password_hash VARCHAR(255) NULL");
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN mobile VARCHAR(15) NULL AFTER phone", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN address TEXT NULL AFTER mobile", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "UPDATE users SET mobile = RIGHT(CONCAT('0000000000', id), 10) WHERE mobile IS NULL OR mobile = ''");
    await safeQuery(appPool, "UPDATE users SET address = 'Address not provided' WHERE address IS NULL OR address = ''");
    await safeQuery(appPool, "ALTER TABLE users MODIFY COLUMN mobile VARCHAR(15) NOT NULL");
    await safeQuery(appPool, "ALTER TABLE users MODIFY COLUMN address TEXT NOT NULL");
    await safeQuery(appPool, "CREATE UNIQUE INDEX idx_users_mobile ON users(mobile)", ["ER_DUP_KEYNAME"]);
    await safeQuery(appPool, "CREATE INDEX idx_users_role ON users(role)", ["ER_DUP_KEYNAME"]);
    await safeQuery(appPool, "CREATE INDEX idx_users_address ON users(address(255))", ["ER_DUP_KEYNAME"]);
    await safeQuery(appPool, "ALTER TABLE company_documents ADD UNIQUE KEY unique_company_doc (company_id, doc_type)", ["ER_DUP_KEYNAME"]);
    await runSqlFile(appPool, businessCommMigrationFile);
    await runSqlFile(appPool, groupChatMigrationFile);
    await runSqlFile(appPool, verificationMigrationFile);
    await appPool.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('admin','sales','customer','vendor','electrician','field_work') NOT NULL"
    );
    await appPool.query(
      "ALTER TABLE conversations MODIFY COLUMN scope ENUM('sales_customer','admin_sales','admin_vendor','admin_electrician','admin_field_work','sales_vendor','vendor_electrician','vendor_customer','vendor_field_work','customer_electrician','sales_electrician') NOT NULL"
    );
    await appPool.query("ALTER TABLE tasks MODIFY COLUMN role_type ENUM('vendor','electrician','field_work') NOT NULL");
    await appPool.query("ALTER TABLE messages MODIFY COLUMN message_body TEXT NULL");
    await safeQuery(appPool, "ALTER TABLE messages ADD COLUMN image_url VARCHAR(500) NULL AFTER message_body", [
      "ER_DUP_FIELDNAME"
    ]);
    await safeQuery(appPool, "ALTER TABLE messages ADD COLUMN pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER is_read", [
      "ER_DUP_FIELDNAME"
    ]);
    await safeQuery(appPool, "ALTER TABLE messages ADD COLUMN pinned_at TIMESTAMP NULL DEFAULT NULL AFTER pinned", [
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
