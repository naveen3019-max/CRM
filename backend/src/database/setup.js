import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
const { Pool } = pg;
import bcrypt from "bcryptjs";
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
  // pg doesn't support multiple statements with parameters, but it works for plain strings
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
  // In Supabase, the database is already created, so we don't need the admin pool to CREATE DATABASE.
  const appPool = new Pool({
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
    max: 2
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
    const requiredTablesMigrationFile = path.resolve(__dirname, "migrations/019_required_tables.sql");
    const seedFile = path.resolve(__dirname, "seeds/001_seed_users.sql");

    await runSqlFileSafe(appPool, migrationFile);
    await runSqlFileSafe(appPool, onboardingMigrationFile);
    
    // Postgres duplicate column error code is 42701
    // Postgres syntax doesn't support AFTER column_name, so we remove it.
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN service_type VARCHAR(255)", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN description TEXT", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN years_of_experience INT", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN city VARCHAR(100)", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN state VARCHAR(100)", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN pincode VARCHAR(10)", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN alternate_phone VARCHAR(20)", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN business_email VARCHAR(255)", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN website VARCHAR(255)", ["42701"]);
    
    await safeQuery(appPool, "ALTER TABLE companies ADD COLUMN user_id BIGINT NULL", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE companies ALTER COLUMN password_hash DROP NOT NULL");
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN mobile VARCHAR(15) NULL", ["42701"]);
    await safeQuery(appPool, "UPDATE users SET mobile = RIGHT('0000000000' || id::text, 10) WHERE mobile IS NULL OR mobile = ''");
    await safeQuery(appPool, "ALTER TABLE users ALTER COLUMN mobile SET NOT NULL");
    
    // duplicate_table/relation error code is 42P07
    await safeQuery(appPool, "CREATE UNIQUE INDEX idx_users_mobile ON users(mobile)", ["42P07"]);
    await safeQuery(appPool, "CREATE INDEX idx_users_role ON users(role)", ["42P07"]);
    
    try {
      await appPool.query("ALTER TABLE users ALTER COLUMN address SET DEFAULT '', ALTER COLUMN address SET NOT NULL");
      console.log("[DB Setup] Successfully modified address column to have default value");
    } catch (err) {
      console.warn('[DB Setup] Error setting default on address column:', err.message);
    }
    
    await runSqlFileSafe(appPool, businessCommMigrationFile);
    await runSqlFileSafe(appPool, groupChatMigrationFile);
    await runSqlFileSafe(appPool, verificationMigrationFile);
    
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN state VARCHAR(100) NULL", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN city VARCHAR(100) NULL", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN pincode VARCHAR(10) NULL", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN experience INT NULL", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN about TEXT NULL", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN skills TEXT NULL", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN work_type VARCHAR(255) NULL", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) NOT NULL DEFAULT 'en'", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE users ADD COLUMN profile_completed BOOLEAN NOT NULL DEFAULT false", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE company_documents ADD CONSTRAINT unique_company_doc UNIQUE (company_id, doc_type)", ["42P07"]);
    
    // Postgres ENUM alterations usually require creating a custom TYPE. We'll skip the exact ENUM ALTER for now or use VARCHAR if they drop enums.
    // For simplicity, converting those to VARCHAR is safer if ENUMs aren't strictly set up.
    await safeQuery(appPool, "ALTER TABLE messages ALTER COLUMN message_body DROP NOT NULL");
    await safeQuery(appPool, "ALTER TABLE messages ADD COLUMN image_url VARCHAR(500) NULL", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE messages ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false", ["42701"]);
    await safeQuery(appPool, "ALTER TABLE messages ADD COLUMN pinned_at TIMESTAMP NULL DEFAULT NULL", ["42701"]);
    
    await runSqlFileSafe(appPool, serviceRequestsMigrationFile);
    await runSqlFileSafe(appPool, serviceRequestCancelReasonMigrationFile);
    await runSqlFileSafe(appPool, workAssignmentsMigrationFile);
    await runSqlFileSafe(appPool, addServiceCategoryMigrationFile);
    await runSqlFileSafe(appPool, syncEnumsMigrationFile);
    await runSqlFileSafe(appPool, addLastSeenMigrationFile);
    await runSqlFileSafe(appPool, requiredTablesMigrationFile);
    await runSqlFileSafe(appPool, seedFile);

    // Admin Seed Logic
    const adminEmail = "admin@verbenatech.com";
    const adminPass = "ChangeMe@123";
    const result = await appPool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [adminEmail]);
    
    if (result.rows.length === 0) {
      const hash = await bcrypt.hash(adminPass, 10);
      await appPool.query(
        "INSERT INTO users (name, email, password_hash, role, mobile) VALUES ($1, $2, $3, $4, $5)",
        ["Platform Admin", adminEmail, hash, "admin", "0000000000"]
      );
      console.log("[DB Setup] Default admin account seeded.");
    }

    console.log(`Database setup completed for ${env.dbName}`);
  } finally {
    await appPool.end();
  }
}

setupDatabase().catch((error) => {
  console.error("Database setup failed", error);
  process.exit(1);
});
