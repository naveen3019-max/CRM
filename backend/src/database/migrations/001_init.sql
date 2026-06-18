CREATE DATABASE IF NOT EXISTS verbena_crm;
USE verbena_crm;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT  PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  is_active SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP 
  -- index removed
  -- index removed
) ;

CREATE TABLE IF NOT EXISTS leads (
  id BIGINT  PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  assigned_sales_id BIGINT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'new',
  source VARCHAR(50) NOT NULL,
  title VARCHAR(120) NOT NULL,
  budget DECIMAL(12, 2) NULL,
  expected_close_date DATE NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT fk_leads_customer FOREIGN KEY (customer_id) REFERENCES users (id),
  CONSTRAINT fk_leads_sales FOREIGN KEY (assigned_sales_id) REFERENCES users (id),
  CONSTRAINT fk_leads_creator FOREIGN KEY (created_by) REFERENCES users (id)
  -- index removed
  -- index removed
  -- index removed
) ;

CREATE TABLE IF NOT EXISTS lead_notes (
  id BIGINT  PRIMARY KEY,
  lead_id BIGINT NOT NULL,
  sales_id BIGINT NOT NULL,
  note TEXT NOT NULL,
  follow_up_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lead_notes_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_notes_sales FOREIGN KEY (sales_id) REFERENCES users (id)
  -- index removed
  -- index removed
) ;

CREATE TABLE IF NOT EXISTS projects_orders (
  id BIGINT  PRIMARY KEY,
  lead_id BIGINT NULL,
  customer_id BIGINT NOT NULL,
  vendor_id BIGINT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(12, 2) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT fk_projects_lead FOREIGN KEY (lead_id) REFERENCES leads (id),
  CONSTRAINT fk_projects_customer FOREIGN KEY (customer_id) REFERENCES users (id),
  CONSTRAINT fk_projects_vendor FOREIGN KEY (vendor_id) REFERENCES users (id)
  -- index removed
  -- index removed
  -- index removed
) ;

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT  PRIMARY KEY,
  title VARCHAR(140) NOT NULL,
  description TEXT NULL,
  lead_id BIGINT NULL,
  project_order_id BIGINT NULL,
  assigned_to BIGINT NOT NULL,
  role_type VARCHAR(255) NOT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ,
  CONSTRAINT fk_tasks_lead FOREIGN KEY (lead_id) REFERENCES leads (id),
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_order_id) REFERENCES projects_orders (id),
  CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to) REFERENCES users (id),
  CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users (id)
  -- index removed
  -- index removed
  -- index removed
) ;

CREATE TABLE IF NOT EXISTS task_updates (
  id BIGINT  PRIMARY KEY,
  task_id BIGINT NOT NULL,
  updated_by BIGINT NOT NULL,
  status VARCHAR(255) NULL,
  note TEXT NULL,
  proof_image_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_task_updates_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_task_updates_user FOREIGN KEY (updated_by) REFERENCES users (id)
  -- index removed
) ;

CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT  PRIMARY KEY,
  scope VARCHAR(255) NOT NULL,
  participant_low_id BIGINT NOT NULL,
  participant_high_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_conversations_low FOREIGN KEY (participant_low_id) REFERENCES users (id),
  CONSTRAINT fk_conversations_high FOREIGN KEY (participant_high_id) REFERENCES users (id),
  CONSTRAINT chk_distinct_participants CHECK (participant_low_id <> participant_high_id)
  -- unique key removed
  -- index removed
) ;

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT  PRIMARY KEY,
  conversation_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  receiver_id BIGINT NOT NULL,
  message_body TEXT NULL,
  image_url VARCHAR(500) NULL,
  is_read SMALLINT NOT NULL DEFAULT 0,
  pinned SMALLINT NOT NULL DEFAULT 0,
  pinned_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id),
  CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users (id)
  -- index removed
  -- index removed
) ;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT  PRIMARY KEY,
  user_id BIGINT NOT NULL,
  message VARCHAR(500) NOT NULL,
  payload_json JSON NULL,
  read_status SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  -- index removed
  -- index removed
) ;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT  PRIMARY KEY,
  actor_id BIGINT NOT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_id) REFERENCES users (id)
  -- index removed
  -- index removed
  -- index removed
) ;

CREATE TABLE IF NOT EXISTS attachments (
  id BIGINT  PRIMARY KEY,
  task_id BIGINT NULL,
  uploaded_by BIGINT NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attachments_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL,
  CONSTRAINT fk_attachments_user FOREIGN KEY (uploaded_by) REFERENCES users (id)
  -- index removed
) ;
