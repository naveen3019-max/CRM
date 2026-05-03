-- Group Chat System

-- 1. Create groups table
CREATE TABLE groups (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scope ENUM('custom','admin_sales','admin_vendor','admin_electrician','admin_field_work','sales_customer','sales_vendor','vendor_electrician','vendor_customer','vendor_field_work','customer_electrician','sales_electrician') NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_scope_created (scope, created_at),
  INDEX idx_created_by (created_by)
);

-- 2. Create group_members table
CREATE TABLE group_members (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('admin', 'member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_group_user (group_id, user_id),
  INDEX idx_user_groups (user_id),
  INDEX idx_group_members (group_id)
);

-- 3. Modify messages table to support group messages
ALTER TABLE messages
ADD COLUMN group_id BIGINT UNSIGNED NULL AFTER receiver_id,
ADD COLUMN is_group_message TINYINT DEFAULT 0 AFTER is_read,
ADD COLUMN pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER is_group_message,
ADD COLUMN pinned_at TIMESTAMP NULL DEFAULT NULL AFTER pinned,
ADD FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
ADD INDEX idx_group_messages (group_id, created_at);

-- 4. Create group unread tracking
CREATE TABLE group_message_unread (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  message_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_message (user_id, message_id),
  INDEX idx_group_user_unread (group_id, user_id),
  INDEX idx_message_created (message_id, created_at)
);
