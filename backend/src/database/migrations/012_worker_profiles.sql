-- ============================================================
-- Migration 012: Multi-Service Worker Profiles
-- Adds the `worker` role and a dedicated worker_profiles table
-- ============================================================

USE verbena_crm;

-- 1. Extend the users role ENUM to include 'worker'
ALTER TABLE users
  MODIFY COLUMN role ENUM(
    'admin', 'sales', 'customer', 'vendor',
    'electrician', 'field_work', 'worker'
  ) NOT NULL;

-- 2. Extend tasks role_type ENUM to include 'worker'
ALTER TABLE tasks
  MODIFY COLUMN role_type ENUM('vendor', 'electrician', 'field_work', 'worker') NOT NULL;

-- 3. Create the worker_profiles table
CREATE TABLE IF NOT EXISTS worker_profiles (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             BIGINT UNSIGNED NOT NULL UNIQUE,
  service_categories  JSON NOT NULL DEFAULT (JSON_ARRAY()),
  experience_level    ENUM('fresher', 'junior', 'mid', 'senior', 'expert') NOT NULL DEFAULT 'fresher',
  service_areas       JSON NOT NULL DEFAULT (JSON_ARRAY()),
  availability_status ENUM('available', 'busy', 'off') NOT NULL DEFAULT 'available',
  verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  languages_known     JSON NOT NULL DEFAULT (JSON_ARRAY()),
  work_description    TEXT NULL,
  id_document_url     VARCHAR(500) NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_worker_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_worker_profiles_availability (availability_status),
  INDEX idx_worker_profiles_verification (verification_status)
) ENGINE=InnoDB;

-- 4. Add scope entries for worker in conversations ENUM
ALTER TABLE conversations
  MODIFY COLUMN scope ENUM(
    'sales_customer','admin_sales','admin_vendor',
    'admin_electrician','admin_field_work','admin_customer',
    'sales_vendor','vendor_electrician','vendor_customer',
    'vendor_field_work','customer_electrician','sales_electrician',
    'admin_worker','sales_worker'
  ) NOT NULL;
