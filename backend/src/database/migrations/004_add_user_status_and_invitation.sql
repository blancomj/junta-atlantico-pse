-- Add status and invitation fields to entity_users
ALTER TABLE entity_users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER is_active;
ALTER TABLE entity_users ADD COLUMN invitation_token VARCHAR(255) NULL AFTER status;
ALTER TABLE entity_users ADD COLUMN invitation_expires_at TIMESTAMP NULL AFTER invitation_token;
ALTER TABLE entity_users ADD COLUMN password_setup_at TIMESTAMP NULL AFTER invitation_expires_at;

-- Set existing users as active
UPDATE entity_users SET status = 'active' WHERE status = 'pending';
