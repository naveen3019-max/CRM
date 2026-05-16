-- Add profile completion fields to users table
ALTER TABLE users ADD COLUMN phone VARCHAR(30) NULL AFTER mobile;
ALTER TABLE users ADD COLUMN state VARCHAR(100) NULL AFTER phone;
ALTER TABLE users ADD COLUMN city VARCHAR(100) NULL AFTER state;
ALTER TABLE users ADD COLUMN pincode VARCHAR(10) NULL AFTER city;
ALTER TABLE users ADD COLUMN experience INT NULL AFTER pincode;
ALTER TABLE users ADD COLUMN about TEXT NULL AFTER experience;
ALTER TABLE users ADD COLUMN skills TEXT NULL AFTER about;
ALTER TABLE users ADD COLUMN work_type VARCHAR(255) NULL AFTER skills;
ALTER TABLE users ADD COLUMN profile_completed TINYINT(1) NOT NULL DEFAULT 0 AFTER work_type;
