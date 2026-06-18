ALTER TABLE users
ADD COLUMN preferred_language VARCHAR(10) NOT NULL DEFAULT 'en' ;

ALTER TABLE messages
ADD COLUMN original_message TEXT NULL ,
ADD COLUMN original_language VARCHAR(10) NULL ,
ADD COLUMN translated_messages JSON NULL ;