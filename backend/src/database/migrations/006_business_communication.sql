-- Business Communication System Schema Expansion

-- 1. Extend Leads table with structured operational data
ALTER TABLE leads
ADD COLUMN location_lat DECIMAL(10, 8) NULL,
ADD COLUMN location_lng DECIMAL(11, 8) NULL,
ADD COLUMN address_details TEXT NULL,
ADD COLUMN scheduled_at DATETIME NULL,
ADD COLUMN requirement_details TEXT NULL,
ADD COLUMN assigned_vendor_id BIGINT UNSIGNED NULL,
ADD CONSTRAINT fk_leads_vendor FOREIGN KEY (assigned_vendor_id) REFERENCES users (id);

-- 2. Extend Conversations to support Lead association
ALTER TABLE conversations
ADD COLUMN lead_id BIGINT UNSIGNED NULL AFTER scope,
ADD CONSTRAINT fk_conversations_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE SET NULL;

-- 3. Extend Messages to support structured types and metadata
ALTER TABLE messages
ADD COLUMN type ENUM('text', 'location', 'schedule', 'requirement', 'file', 'task_assignment', 'system_event') NOT NULL DEFAULT 'text' AFTER receiver_id,
ADD COLUMN metadata_json JSON NULL AFTER message_body;

-- 4. Create Activity Logs index for faster retrieval in the side panel
CREATE INDEX idx_activity_entity_created ON activity_logs (entity_type, entity_id, created_at);
