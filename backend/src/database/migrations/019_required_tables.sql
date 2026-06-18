-- Ensure required profile table exists for worker/service users.
-- This migration is idempotent and safe to run multiple times.

CREATE TABLE IF NOT EXISTS worker_profiles (
  id BIGINT  PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  service_categories JSON NULL,
  experience_level VARCHAR(255) NOT NULL DEFAULT 'fresher',
  service_areas JSON NULL,
  availability_status VARCHAR(255) NOT NULL DEFAULT 'available',
  verification_status VARCHAR(255) NOT NULL DEFAULT 'pending',
  languages_known JSON NULL,
  work_description TEXT NULL,
  id_document_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT fk_worker_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  -- index removed
  -- index removed
) ;
