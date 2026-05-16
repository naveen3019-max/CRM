ALTER TABLE users
ADD COLUMN preferred_language VARCHAR(10) NOT NULL DEFAULT 'en' AFTER custom_role_title;

ALTER TABLE messages
ADD COLUMN original_message TEXT NULL AFTER image_url,
ADD COLUMN original_language VARCHAR(10) NULL AFTER original_message,
ADD COLUMN translated_messages JSON NULL AFTER original_language;