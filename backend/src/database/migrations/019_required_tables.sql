-- Ensure required profile table exists for worker/service users.
-- This migration is idempotent and safe to run multiple times.

CREATE TABLE IF NOT EXISTS worker_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  service_categories JSON NULL,
  experience_level ENUM('fresher', 'junior', 'mid', 'senior', 'expert') NOT NULL DEFAULT 'fresher',
  service_areas JSON NULL,
  availability_status ENUM('available', 'busy', 'off') NOT NULL DEFAULT 'available',
  verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  languages_known JSON NULL,
  work_description TEXT NULL,
  id_document_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_worker_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_worker_profiles_availability (availability_status),
  INDEX idx_worker_profiles_verification (verification_status)
) ENGINE=InnoDB;
