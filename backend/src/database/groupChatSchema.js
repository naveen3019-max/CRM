import { pool } from "../config/db.js";

async function safeQuery(sql, ignoreErrorCodes = []) {
  try {
    await pool.query(sql);
  } catch (error) {
    if (ignoreErrorCodes.includes(error.code)) {
      return;
    }
    throw error;
  }
}

export async function ensureGroupChatSchema() {
  await safeQuery(`
    DO $$ BEGIN
      CREATE TYPE group_scope AS ENUM ('custom','admin_sales','admin_vendor','admin_electrician','admin_field_work','sales_customer','sales_vendor','vendor_electrician','vendor_customer','vendor_field_work','customer_electrician','sales_electrician');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await safeQuery(`
    DO $$ BEGIN
      CREATE TYPE group_member_role AS ENUM ('admin', 'member');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "groups" (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      scope group_scope NOT NULL,
      created_by BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await safeQuery(`CREATE INDEX IF NOT EXISTS idx_scope_created ON "groups" (scope, created_at)`);
  await safeQuery(`CREATE INDEX IF NOT EXISTS idx_created_by ON "groups" (created_by)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_members (
      id SERIAL PRIMARY KEY,
      group_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      role group_member_role DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES "groups"(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (group_id, user_id)
    )
  `);

  await safeQuery(`CREATE INDEX IF NOT EXISTS idx_user_groups ON group_members (user_id)`);
  await safeQuery(`CREATE INDEX IF NOT EXISTS idx_group_members ON group_members (group_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_message_unread (
      id SERIAL PRIMARY KEY,
      group_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      message_id BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES "groups"(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      UNIQUE (user_id, message_id)
    )
  `);

  await safeQuery(`CREATE INDEX IF NOT EXISTS idx_group_user_unread ON group_message_unread (group_id, user_id)`);
  await safeQuery(`CREATE INDEX IF NOT EXISTS idx_message_created ON group_message_unread (message_id, created_at)`);

  await safeQuery(`ALTER TABLE messages ADD COLUMN group_id BIGINT NULL`, ["42701"]);
  await safeQuery(`ALTER TABLE messages ADD COLUMN is_group_message BOOLEAN DEFAULT false`, ["42701"]);
  await safeQuery(`ALTER TABLE messages ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false`, ["42701"]);
  await safeQuery(`ALTER TABLE messages ADD COLUMN pinned_at TIMESTAMP NULL DEFAULT NULL`, ["42701"]);
  await safeQuery(`ALTER TABLE messages ADD CONSTRAINT fk_messages_group FOREIGN KEY (group_id) REFERENCES "groups"(id) ON DELETE CASCADE`, ["42710"]);
  await safeQuery(`CREATE INDEX IF NOT EXISTS idx_group_messages ON messages (group_id, created_at)`);
}