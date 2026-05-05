-- Add email verification fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255) NULL AFTER email_verified;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP NULL AFTER verification_token;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_attempts INT NOT NULL DEFAULT 0 AFTER verification_token_expires_at;

-- Add index for verification lookup
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
