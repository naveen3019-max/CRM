-- Add request details columns to leads table for customer request submissions
ALTER TABLE leads
ADD COLUMN people_involved VARCHAR(500) NULL AFTER title,
ADD COLUMN problem_description TEXT NULL AFTER people_involved,
ADD COLUMN solution TEXT NULL AFTER problem_description,
ADD COLUMN requirements TEXT NULL AFTER solution;
