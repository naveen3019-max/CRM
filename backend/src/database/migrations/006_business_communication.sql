-- Business Communication System Schema Expansion

-- 1. Extend Leads table with structured operational data
ALTER TABLE leads
ADD COLUMN location_lat DECIMAL(10, 8) NULL,
ADD COLUMN location_lng DECIMAL(11, 8) NULL,
ADD COLUMN address_details TEXT NULL,
ADD COLUMN scheduled_at TIMESTAMP NULL,
ADD COLUMN requirement_details TEXT NULL,
ADD COLUMN assigned_vendor_id BIGINT NULL,
ADD CONSTRAINT fk_leads_vendor FOREIGN KEY (assigned_vendor_id) REFERENCES users (id);

-- 2. Extend Conversations to support Lead association
ALTER TABLE conversations
ADD COLUMN lead_id BIGINT NULL ,
ADD CONSTRAINT fk_conversations_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE SET NULL;

-- 3. Extend Messages to support structured types and metadata
ALTER TABLE messages
ADD COLUMN type VARCHAR(255) NOT NULL DEFAULT 'text' ,
ADD COLUMN metadata_json JSON NULL ;

-- 4. Create Activity Logs index for faster retrieval in the side panel
CREATE INDEX idx_activity_entity_created ON activity_logs (entity_type, entity_id, created_at);
