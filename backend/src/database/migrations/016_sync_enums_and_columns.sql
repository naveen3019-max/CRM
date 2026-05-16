-- Migration 016: Sync enums and add service_category/is_online columns
-- Safe to run multiple times; errors are logged by setup.js

-- 1) Extend users.role enum to include service_professional
ALTER TABLE users
  MODIFY COLUMN role ENUM('admin','sales','customer','vendor','electrician','field_work','service_professional') NOT NULL;

-- 2) Extend conversations.scope enum to include service_professional scopes
ALTER TABLE conversations
  MODIFY COLUMN scope ENUM(
    'sales_customer','admin_sales','admin_vendor','admin_electrician','admin_customer',
    'admin_field_work','sales_field_work','sales_vendor','vendor_electrician','vendor_customer',
    'vendor_field_work','customer_electrician','sales_electrician',
    'admin_service_professional','sales_service_professional','vendor_service_professional'
  ) NOT NULL;

-- 3) Extend tasks.role_type enum to include service_professional
ALTER TABLE tasks
  MODIFY COLUMN role_type ENUM('vendor','electrician','field_work','service_professional') NOT NULL;

-- 4) Add service_category column if missing
ALTER TABLE users
  ADD COLUMN service_category VARCHAR(255) NULL AFTER work_type;

-- 5) Add is_online column if missing
ALTER TABLE users
  ADD COLUMN is_online TINYINT(1) NOT NULL DEFAULT 0 AFTER skills;

-- 6) Backfill service_category from work_type for existing users
UPDATE users
SET service_category = work_type
WHERE (service_category IS NULL OR service_category = '')
  AND (work_type IS NOT NULL AND work_type <> '');

-- 7) Convert legacy role values
UPDATE users
SET role = 'service_professional'
WHERE role = 'field_work';
