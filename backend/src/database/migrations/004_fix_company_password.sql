-- Make password_hash nullable in companies table as we now use users table for auth
ALTER TABLE companies MODIFY COLUMN password_hash VARCHAR(255) NULL;
