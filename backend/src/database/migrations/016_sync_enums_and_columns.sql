-- Migration 016: Sync enums and add service_category/is_online columns
-- Safe to run multiple times; errors are logged by setup.js

-- 1) Extend users.role enum to include service_professional
ALTER TABLE users
  MODIFY COLUMN role VARCHAR(255) NOT NULL;

-- 2) Extend conversations.scope enum to include service_professional scopes
ALTER TABLE conversations
  MODIFY COLUMN scope VARCHAR(255) NOT NULL;

-- 3) Extend tasks.role_type enum to include service_professional
ALTER TABLE tasks
  MODIFY COLUMN role_type VARCHAR(255) NOT NULL;

-- 4) Add service_category column if missing
ALTER TABLE users
  ADD COLUMN service_category VARCHAR(255) NULL ;

-- 5) Add is_online column if missing
ALTER TABLE users
  ADD COLUMN is_online SMALLINT NOT NULL DEFAULT 0 ;

-- 6) Backfill service_category from work_type for existing users
UPDATE users
SET service_category = work_type
WHERE (service_category IS NULL OR service_category = '')
  AND (work_type IS NOT NULL AND work_type <> '');

-- 7) Convert legacy role values
UPDATE users
SET role = 'service_professional'
WHERE role = 'field_work';
