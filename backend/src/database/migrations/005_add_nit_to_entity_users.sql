-- Add nit column to entity_users table
ALTER TABLE entity_users ADD COLUMN nit VARCHAR(20) NULL AFTER full_name;

-- Update existing users with NIT from their entity (if available)
UPDATE entity_users eu
INNER JOIN entities e ON eu.entity_id = e.id
SET eu.nit = e.nit
WHERE eu.nit IS NULL AND e.nit IS NOT NULL;
