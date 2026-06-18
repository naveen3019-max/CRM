-- ============================================================
-- Migration 012: Multi-Service Worker Profiles
-- Adds the `worker` role and a dedicated worker_profiles table
-- ============================================================

USE verbena_crm;

-- 1. Extend the users role ENUM to include 'worker'
ALTER TABLE users
  MODIFY COLUMN role VARCHAR(255) NOT NULL;

-- 2. Extend tasks role_type ENUM to include 'worker'
ALTER TABLE tasks
  MODIFY COLUMN role_type VARCHAR(255) NOT NULL;

-- 3. Create the worker_profiles table
CREATE TABLE IF NOT EXISTS worker_profiles (
  id                  BIGINT  PRIMARY KEY,
  user_id             BIGINT NOT NULL UNIQUE,
  service_categories  JSON NOT NULL DEFAULT (JSON_ARRAY()),
  experience_level    VARCHAR(255) NOT NULL DEFAULT 'fresher',
  service_areas       JSON NOT NULL DEFAULT (JSON_ARRAY()),
  availability_status VARCHAR(255) NOT NULL DEFAULT 'available',
  verification_status VARCHAR(255) NOT NULL DEFAULT 'pending',
  languages_known     JSON NOT NULL DEFAULT (JSON_ARRAY()),
  work_description    TEXT NULL,
  id_document_url     VARCHAR(500) NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT fk_worker_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  -- index removed
  -- index removed
) ;

-- 4. Add scope entries for worker in conversations ENUM
ALTER TABLE conversations
  MODIFY COLUMN scope VARCHAR(255) NOT NULL;
