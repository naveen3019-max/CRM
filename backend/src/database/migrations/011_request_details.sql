-- Add request details columns to leads table for customer request submissions
ALTER TABLE leads
ADD COLUMN people_involved VARCHAR(500) NULL ,
ADD COLUMN problem_description TEXT NULL ,
ADD COLUMN solution TEXT NULL ,
ADD COLUMN requirements TEXT NULL ;
