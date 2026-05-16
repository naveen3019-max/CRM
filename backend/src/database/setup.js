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

async function runSqlFileSafe(pool, filePath) {
  try {
    await runSqlFile(pool, filePath);
  } catch (err) {
    console.warn(`[DB Setup] Skipping SQL file ${filePath} due to error: ${err && err.message}`);
  }
}

async function safeQuery(pool, sql, ignoreErrorCodes = []) {
  try {
    await pool.query(sql);
  } catch (error) {
    if (ignoreErrorCodes.includes(error.code)) {
      console.log(`[DB Setup] Ignored error ${error.code}: ${error.message}`);
      return;
    }
    console.error(`[DB Setup] Query failed: ${sql}`);
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
    const removeAddressMigrationFile = path.resolve(__dirname, "migrations/009_remove_user_address.sql");
    const profileCompletionMigrationFile = path.resolve(__dirname, "migrations/010_add_profile_completion_fields.sql");
    const serviceRequestsMigrationFile = path.resolve(__dirname, "migrations/013_service_requests.sql");
    const serviceRequestCancelReasonMigrationFile = path.resolve(__dirname, "migrations/018_add_service_request_cancel_reason.sql");
    const workAssignmentsMigrationFile = path.resolve(__dirname, "migrations/014_work_assignments.sql");
    const addServiceCategoryMigrationFile = path.resolve(__dirname, "migrations/015_add_service_category.sql");
    const syncEnumsMigrationFile = path.resolve(__dirname, "migrations/016_sync_enums_and_columns.sql");
    const addLastSeenMigrationFile = path.resolve(__dirname, "migrations/017_add_last_seen.sql");
    const seedFile = path.resolve(__dirname, "seeds/001_seed_users.sql");

    await runSqlFileSafe(appPool, migrationFile);
    await runSqlFileSafe(appPool, onboardingMigrationFile);
    
    // Add missing columns to companies table (instead of trying to MODIFY non-existent ones)
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN service_type VARCHAR(255) AFTER name", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN description TEXT AFTER service_type", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN years_of_experience INT AFTER description", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN city VARCHAR(100) AFTER address", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN state VARCHAR(100) AFTER city", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN pincode VARCHAR(10) AFTER state", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN alternate_phone VARCHAR(20) AFTER phone", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN business_email VARCHAR(255) AFTER alternate_phone", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN website VARCHAR(255) AFTER business_email", ["ER_DUP_FIELDNAME"]);
    
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE companies MODIFY COLUMN password_hash VARCHAR(255) NULL");
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN mobile VARCHAR(15) NULL AFTER phone", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "UPDATE users SET mobile = RIGHT(CONCAT('0000000000', id), 10) WHERE mobile IS NULL OR mobile = ''");
    await safeQuery(appPool, "ALTER TABLE users MODIFY COLUMN mobile VARCHAR(15) NOT NULL");
    await safeQuery(appPool, "CREATE UNIQUE INDEX idx_users_mobile ON users(mobile)", ["ER_DUP_KEYNAME"]);
    await safeQuery(appPool, "CREATE INDEX idx_users_role ON users(role)", ["ER_DUP_KEYNAME"]);
    // Set default value for address column to support existing inserts
    try {
      await appPool.query("ALTER TABLE users MODIFY COLUMN address TEXT NOT NULL DEFAULT ''");
      console.log("[DB Setup] Successfully modified address column to have default value");
    } catch (err) {
      if (err && err.code === 'ER_BLOB_CANT_HAVE_DEFAULT') {
        console.warn('[DB Setup] Cannot set default on TEXT column `address`; skipping modification');
      } else {
        console.error("[DB Setup] Failed to modify address column:", err.message);
        throw err;
      }
    }
    await runSqlFileSafe(appPool, businessCommMigrationFile);
    await runSqlFileSafe(appPool, groupChatMigrationFile);
    await runSqlFileSafe(appPool, verificationMigrationFile);
    // Add profile completion fields with error handling for existing columns
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL AFTER mobile", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN state VARCHAR(100) NULL", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN city VARCHAR(100) NULL", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN pincode VARCHAR(10) NULL", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN experience INT NULL", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN about TEXT NULL", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN skills TEXT NULL", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN work_type VARCHAR(255) NULL", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) NOT NULL DEFAULT 'en'", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN profile_completed TINYINT(1) NOT NULL DEFAULT 0", ["ER_DUP_FIELDNAME"]);
    await safeQuery(appPool, "ALTER TABLE company_documents ADD UNIQUE KEY unique_company_doc (company_id, doc_type)", ["ER_DUP_KEYNAME"]);
    await appPool.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('admin','sales','customer','vendor','electrician','field_work','service_professional') NOT NULL"
    );
    await appPool.query(
      "ALTER TABLE conversations MODIFY COLUMN scope ENUM('sales_customer','admin_sales','admin_vendor','admin_electrician','admin_customer','admin_field_work','sales_field_work','sales_vendor','vendor_electrician','vendor_customer','vendor_field_work','customer_electrician','sales_electrician','admin_service_professional','sales_service_professional','vendor_service_professional') NOT NULL"
    );
    await appPool.query("ALTER TABLE tasks MODIFY COLUMN role_type ENUM('vendor','electrician','field_work','service_professional') NOT NULL");
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
    await runSqlFileSafe(appPool, serviceRequestsMigrationFile);
    await runSqlFileSafe(appPool, serviceRequestCancelReasonMigrationFile);
    await runSqlFileSafe(appPool, workAssignmentsMigrationFile);
    await runSqlFileSafe(appPool, addServiceCategoryMigrationFile);
    // Run additional sync migrations if present
    await runSqlFileSafe(appPool, syncEnumsMigrationFile);
    await runSqlFileSafe(appPool, addLastSeenMigrationFile);
    await runSqlFileSafe(appPool, seedFile);

    console.log(`Database setup completed for ${env.dbName}`);
  } finally {
    await appPool.end();
  }
}

setupDatabase().catch((error) => {
  console.error("Database setup failed", error);
  process.exit(1);
});
