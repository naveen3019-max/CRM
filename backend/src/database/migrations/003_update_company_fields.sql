-- Update Companies Table with new fields
ALTER TABLE companies
ADD COLUMN service_type ENUM('Solar Installation', 'Electrical Services', 'CCTV Installation') AFTER name,
ADD COLUMN description TEXT AFTER service_type,
ADD COLUMN years_of_experience INT AFTER description,
ADD COLUMN city VARCHAR(100) AFTER address,
ADD COLUMN state VARCHAR(100) AFTER city,
ADD COLUMN pincode VARCHAR(10) AFTER state,
ADD COLUMN alternate_phone VARCHAR(20) AFTER phone,
ADD COLUMN business_email VARCHAR(255) AFTER alternate_phone,
ADD COLUMN website VARCHAR(255) AFTER business_email;

-- Update Document Type Enum
ALTER TABLE company_documents
MODIFY COLUMN doc_type ENUM('gst_certificate', 'pan_card', 'business_registration', 'license', 'bank_proof') NOT NULL;

-- Add foreign key to users if not already linked (optional but recommended)
-- ALTER TABLE companies ADD CONSTRAINT fk_company_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
