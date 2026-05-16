-- Add service_category column and migrate existing field_work users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS service_category VARCHAR(255) NULL AFTER work_type;

-- For users that have work_type set, migrate to service_category if empty
UPDATE users
SET service_category = work_type
WHERE (service_category IS NULL OR service_category = '')
  AND (work_type IS NOT NULL AND work_type <> '');

-- Convert legacy role 'field_work' to 'service_professional'
UPDATE users
SET role = 'service_professional'
WHERE role = 'field_work';

-- Ensure role enum includes new value (handled in application migrations/setup)
