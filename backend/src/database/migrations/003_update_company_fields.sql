-- Update Companies Table with new fields
ALTER TABLE companies
ADD COLUMN service_type VARCHAR(255) ,
ADD COLUMN description TEXT ,
ADD COLUMN years_of_experience INT ,
ADD COLUMN city VARCHAR(100) ,
ADD COLUMN state VARCHAR(100) ,
ADD COLUMN pincode VARCHAR(10) ,
ADD COLUMN alternate_phone VARCHAR(20) ,
ADD COLUMN business_email VARCHAR(255) ,
ADD COLUMN website VARCHAR(255) ;

-- Update Document Type Enum
ALTER TABLE company_documents
MODIFY COLUMN doc_type VARCHAR(255) NOT NULL;

-- Add foreign key to users if not already linked (optional but recommended)
-- ALTER TABLE companies ADD CONSTRAINT fk_company_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
