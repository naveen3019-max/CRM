CREATE DATABASE IF NOT EXISTS verbena_crm;
USE verbena_crm;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'sales', 'customer', 'vendor', 'electrician', 'field_work') NOT NULL,
  phone VARCHAR(30) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leads (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  assigned_sales_id BIGINT UNSIGNED NULL,
  status ENUM('new', 'contacted', 'qualified', 'closed') NOT NULL DEFAULT 'new',
  source VARCHAR(50) NOT NULL,
  title VARCHAR(120) NOT NULL,
  budget DECIMAL(12, 2) NULL,
  expected_close_date DATE NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_leads_customer FOREIGN KEY (customer_id) REFERENCES users (id),
  CONSTRAINT fk_leads_sales FOREIGN KEY (assigned_sales_id) REFERENCES users (id),
  CONSTRAINT fk_leads_creator FOREIGN KEY (created_by) REFERENCES users (id),
  INDEX idx_leads_sales_status (assigned_sales_id, status),
  INDEX idx_leads_customer (customer_id),
  INDEX idx_leads_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lead_notes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id BIGINT UNSIGNED NOT NULL,
  sales_id BIGINT UNSIGNED NOT NULL,
  note TEXT NOT NULL,
  follow_up_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lead_notes_lead FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_notes_sales FOREIGN KEY (sales_id) REFERENCES users (id),
  INDEX idx_lead_notes_lead (lead_id),
  INDEX idx_lead_notes_followup (follow_up_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS projects_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id BIGINT UNSIGNED NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  vendor_id BIGINT UNSIGNED NULL,
  status ENUM('pending', 'active', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(12, 2) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_lead FOREIGN KEY (lead_id) REFERENCES leads (id),
  CONSTRAINT fk_projects_customer FOREIGN KEY (customer_id) REFERENCES users (id),
  CONSTRAINT fk_projects_vendor FOREIGN KEY (vendor_id) REFERENCES users (id),
  INDEX idx_projects_status (status),
  INDEX idx_projects_customer (customer_id),
  INDEX idx_projects_vendor (vendor_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(140) NOT NULL,
  description TEXT NULL,
  lead_id BIGINT UNSIGNED NULL,
  project_order_id BIGINT UNSIGNED NULL,
  assigned_to BIGINT UNSIGNED NOT NULL,
  role_type ENUM('vendor', 'electrician', 'field_work') NOT NULL,
  status ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
  due_date DATETIME NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_lead FOREIGN KEY (lead_id) REFERENCES leads (id),
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_order_id) REFERENCES projects_orders (id),
  CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to) REFERENCES users (id),
  CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  INDEX idx_tasks_assignment (assigned_to, status),
  INDEX idx_tasks_role_status (role_type, status),
  INDEX idx_tasks_due_date (due_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS task_updates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT UNSIGNED NOT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  status ENUM('pending', 'in_progress', 'completed') NULL,
  note TEXT NULL,
  proof_image_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_task_updates_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_task_updates_user FOREIGN KEY (updated_by) REFERENCES users (id),
  INDEX idx_task_updates_task (task_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scope ENUM('sales_customer', 'admin_sales', 'admin_vendor', 'admin_electrician', 'admin_field_work') NOT NULL,
  participant_low_id BIGINT UNSIGNED NOT NULL,
  participant_high_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_conversations_low FOREIGN KEY (participant_low_id) REFERENCES users (id),
  CONSTRAINT fk_conversations_high FOREIGN KEY (participant_high_id) REFERENCES users (id),
  CONSTRAINT chk_distinct_participants CHECK (participant_low_id <> participant_high_id),
  UNIQUE KEY uq_conversation_scope_pair (scope, participant_low_id, participant_high_id),
  INDEX idx_conversation_last_message (last_message_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  receiver_id BIGINT UNSIGNED NOT NULL,
  message_body TEXT NULL,
  image_url VARCHAR(500) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id),
  CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users (id),
  INDEX idx_messages_conversation_created (conversation_id, created_at),
  INDEX idx_messages_receiver_read (receiver_id, is_read)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  message VARCHAR(500) NOT NULL,
  payload_json JSON NULL,
  read_status TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, read_status),
  INDEX idx_notifications_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_id) REFERENCES users (id),
  INDEX idx_activity_actor (actor_id),
  INDEX idx_activity_entity (entity_type, entity_id),
  INDEX idx_activity_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT UNSIGNED NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attachments_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL,
  CONSTRAINT fk_attachments_user FOREIGN KEY (uploaded_by) REFERENCES users (id),
  INDEX idx_attachments_task (task_id)
) ENGINE=InnoDB;
