-- Add email verification fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified SMALLINT NOT NULL DEFAULT 0 ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255) NULL ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP NULL ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_attempts INT NOT NULL DEFAULT 0 ;

-- Add index for verification lookup
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
