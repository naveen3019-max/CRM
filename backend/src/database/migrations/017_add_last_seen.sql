-- Migration 017: Add last_seen column used for search ordering

ALTER TABLE users
  ADD COLUMN last_seen TIMESTAMP NULL DEFAULT NULL AFTER is_online;

-- Optional: initialize last_seen for existing users to current timestamp (uncomment if desired)
-- UPDATE users SET last_seen = NOW() WHERE last_seen IS NULL;
