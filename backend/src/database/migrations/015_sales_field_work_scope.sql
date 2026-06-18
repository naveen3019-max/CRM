-- Extend conversation scopes so sales can coordinate directly with field workers.
ALTER TABLE conversations
  MODIFY COLUMN scope VARCHAR(255) NOT NULL;