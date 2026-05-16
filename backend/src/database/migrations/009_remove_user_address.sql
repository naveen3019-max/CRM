-- Remove address column from users table
-- This migration removes the address field that is no longer used for user registration

ALTER TABLE users MODIFY COLUMN address TEXT NULL DEFAULT NULL;
ALTER TABLE users DROP COLUMN address;
