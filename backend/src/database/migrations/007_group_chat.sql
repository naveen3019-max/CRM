-- Group Chat System

-- 1. Create groups table
CREATE TABLE groups (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scope VARCHAR(255) NOT NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  -- index removed
  -- index removed
);

-- 2. Create group_members table
CREATE TABLE group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(255) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  -- unique key removed
  -- index removed
  -- index removed
);

-- 3. Modify messages table to support group messages
ALTER TABLE messages
ADD COLUMN group_id BIGINT NULL ,
ADD COLUMN is_group_message SMALLINT DEFAULT 0 ,
ADD COLUMN pinned SMALLINT NOT NULL DEFAULT 0 ,
ADD COLUMN pinned_at TIMESTAMP NULL DEFAULT NULL ,
ADD FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
ADD -- index removed;

-- 4. Create group unread tracking
CREATE TABLE group_message_unread (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  message_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
  -- unique key removed
  -- index removed
  -- index removed
);
